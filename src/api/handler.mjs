// Dashboard API for the Orbit web frontend, served via a Lambda Function URL.
// Routes: tasks CRUD (DynamoDB), report list/fetch (S3 archive), run status,
// and a manual trigger that async-invokes the briefing Lambda.
//
// Auth: every request must carry `x-orbit-token` matching the SecureString at
// SSM /orbit/dashboard-token. Single-user tool; a shared secret is enough.
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { NO_DEADLINE_SENTINEL } from "../sources/tasks.mjs";

const TASKS_TABLE = process.env.TASKS_TABLE;
const REPORTS_BUCKET = process.env.REPORTS_BUCKET;
const BRIEFING_FUNCTION = process.env.BRIEFING_FUNCTION;
const REPORT_PREFIX = "reports/";

const STATUSES = ["todo", "in_progress", "blocked", "done"];
const EDITABLE_FIELDS = [
  "title",
  "deadline",
  "importance",
  "status",
  "category",
  "effort",
];

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});
const lambda = new LambdaClient({});
const ssm = new SSMClient({});

let cachedToken = null;

async function getDashboardToken() {
  if (cachedToken) return cachedToken;
  const out = await ssm.send(
    new GetParameterCommand({
      Name: "/orbit/dashboard-token",
      WithDecryption: true,
    })
  );
  cachedToken = out.Parameter?.Value ?? null;
  return cachedToken;
}

function tokenMatches(provided, expected) {
  if (!provided || !expected) return false;
  // Hash both sides so timingSafeEqual gets equal-length buffers.
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

// ---------- tasks ----------

function fromItem(item) {
  return {
    ...item,
    deadline: item.deadline === NO_DEADLINE_SENTINEL ? null : item.deadline,
  };
}

async function listTasks() {
  const results = await Promise.all(
    STATUSES.map((status) =>
      ddb.send(
        new QueryCommand({
          TableName: TASKS_TABLE,
          IndexName: "status-deadline-index",
          KeyConditionExpression: "#s = :status",
          ExpressionAttributeNames: { "#s": "status" },
          ExpressionAttributeValues: { ":status": status },
        })
      )
    )
  );
  const tasks = results.flatMap((r) => r.Items ?? []).map(fromItem);
  tasks.sort((a, b) =>
    (a.deadline ?? NO_DEADLINE_SENTINEL).localeCompare(
      b.deadline ?? NO_DEADLINE_SENTINEL
    )
  );
  return json(200, { tasks });
}

function validateTaskInput(input, { requireTitle }) {
  const errors = [];
  if (requireTitle && !input.title?.trim()) errors.push("title is required");
  if (input.status !== undefined && !STATUSES.includes(input.status))
    errors.push(`status must be one of ${STATUSES.join(", ")}`);
  if (
    input.importance !== undefined &&
    !(Number.isInteger(input.importance) && input.importance >= 1 && input.importance <= 5)
  )
    errors.push("importance must be an integer 1-5");
  if (
    input.deadline !== undefined &&
    input.deadline !== null &&
    !/^\d{4}-\d{2}-\d{2}$/.test(input.deadline)
  )
    errors.push("deadline must be YYYY-MM-DD or null");
  return errors;
}

async function createTask(input) {
  const errors = validateTaskInput(input, { requireTitle: true });
  if (errors.length) return json(400, { errors });

  const now = new Date().toISOString();
  const item = {
    id: randomUUID(),
    title: input.title.trim(),
    // GSI is keyed on deadline, so deadline-less tasks store the sentinel.
    deadline: input.deadline ?? NO_DEADLINE_SENTINEL,
    importance: input.importance ?? 3,
    status: input.status ?? "todo",
    category: input.category?.trim() || "general",
    effort: input.effort?.trim() || "normal",
    createdAt: now,
    updatedAt: now,
  };
  await ddb.send(new PutCommand({ TableName: TASKS_TABLE, Item: item }));
  return json(201, { task: fromItem(item) });
}

async function updateTask(id, input) {
  const errors = validateTaskInput(input, { requireTitle: false });
  if (errors.length) return json(400, { errors });

  const sets = ["#updatedAt = :updatedAt"];
  const names = { "#updatedAt": "updatedAt" };
  const values = { ":updatedAt": new Date().toISOString() };
  for (const field of EDITABLE_FIELDS) {
    if (input[field] === undefined) continue;
    const value =
      field === "deadline" ? input.deadline ?? NO_DEADLINE_SENTINEL : input[field];
    sets.push(`#${field} = :${field}`);
    names[`#${field}`] = field;
    values[`:${field}`] = value;
  }
  if (input.status === "done") {
    sets.push("#completedAt = :completedAt");
    names["#completedAt"] = "completedAt";
    values[":completedAt"] = values[":updatedAt"];
  }

  try {
    const out = await ddb.send(
      new UpdateCommand({
        TableName: TASKS_TABLE,
        Key: { id },
        UpdateExpression: `SET ${sets.join(", ")}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ConditionExpression: "attribute_exists(id)",
        ReturnValues: "ALL_NEW",
      })
    );
    return json(200, { task: fromItem(out.Attributes) });
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException")
      return json(404, { error: "task not found" });
    throw err;
  }
}

async function deleteTask(id) {
  await ddb.send(new DeleteCommand({ TableName: TASKS_TABLE, Key: { id } }));
  return json(200, { deleted: id });
}

// ---------- reports ----------

async function listReports() {
  const listed = await s3.send(
    new ListObjectsV2Command({ Bucket: REPORTS_BUCKET, Prefix: REPORT_PREFIX })
  );
  const reports = (listed.Contents ?? [])
    .filter((o) => o.Key.endsWith(".md"))
    .map((o) => ({
      date: o.Key.slice(REPORT_PREFIX.length, -3),
      lastModified: o.LastModified?.toISOString() ?? null,
      size: o.Size,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
  return json(200, { reports });
}

async function readObject(key) {
  const obj = await s3.send(
    new GetObjectCommand({ Bucket: REPORTS_BUCKET, Key: key })
  );
  return {
    body: await obj.Body.transformToString(),
    lastModified: obj.LastModified?.toISOString() ?? null,
  };
}

/** Cheap GitHub/task signal summary from the run's archived context JSON. */
function summarizeContext(context) {
  const repos = Array.isArray(context.github) ? context.github : [];
  return {
    taskCount: context.tasks?.length ?? 0,
    repoCount: repos.length,
    staleRepos: repos
      .filter((r) => r.isStale)
      .map((r) => ({ repo: r.repo, daysStale: r.daysStale ?? null })),
    failingCi: repos.filter((r) => r.failingCi).map((r) => r.repo),
    openPullRequests: repos
      .filter((r) => (r.openPullRequestCount ?? 0) > 0)
      .map((r) => ({ repo: r.repo, count: r.openPullRequestCount })),
  };
}

async function getReport(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    return json(400, { error: "date must be YYYY-MM-DD" });

  let markdown;
  try {
    markdown = await readObject(`${REPORT_PREFIX}${date}.md`);
  } catch (err) {
    if (err.name === "NoSuchKey") return json(404, { error: "no report for that date" });
    throw err;
  }

  let signals = null;
  try {
    const context = await readObject(`${REPORT_PREFIX}${date}.context.json`);
    signals = summarizeContext(JSON.parse(context.body));
  } catch {
    // Context JSON is best-effort; the markdown alone is still a valid report.
  }

  return json(200, {
    date,
    generatedAt: markdown.lastModified,
    markdown: markdown.body,
    signals,
  });
}

// ---------- run status / trigger ----------

/** Next 6:00 AM Africa/Accra. Ghana is UTC+0 year-round, so compute in UTC. */
function nextScheduledRun(now = new Date()) {
  const next = new Date(now);
  next.setUTCHours(6, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString();
}

async function getStatus() {
  const listed = await s3.send(
    new ListObjectsV2Command({ Bucket: REPORTS_BUCKET, Prefix: REPORT_PREFIX })
  );
  const latest = (listed.Contents ?? [])
    .filter((o) => o.Key.endsWith(".md"))
    .sort((a, b) => b.Key.localeCompare(a.Key))[0];

  return json(200, {
    lastRun: latest
      ? {
          date: latest.Key.slice(REPORT_PREFIX.length, -3),
          completedAt: latest.LastModified?.toISOString() ?? null,
        }
      : null,
    nextRun: nextScheduledRun(),
    schedule: { cron: "0 6 * * ? *", timezone: "Africa/Accra" },
  });
}

async function triggerRun() {
  await lambda.send(
    new InvokeCommand({
      FunctionName: BRIEFING_FUNCTION,
      InvocationType: "Event",
      Payload: JSON.stringify({ source: "dashboard", trigger: "manual" }),
    })
  );
  return json(202, { started: true });
}

// ---------- router ----------

export async function handler(event) {
  const method = event.requestContext?.http?.method ?? "GET";
  // Strip trailing slash so /tasks/ and /tasks route identically.
  const path = (event.rawPath ?? "/").replace(/\/+$/, "") || "/";

  if (method === "OPTIONS") return { statusCode: 204 }; // CORS preflight (headers added by Function URL)

  const expected = await getDashboardToken();
  if (!tokenMatches(event.headers?.["x-orbit-token"], expected))
    return json(401, { error: "invalid or missing token" });

  let body = {};
  if (event.body) {
    try {
      body = JSON.parse(
        event.isBase64Encoded
          ? Buffer.from(event.body, "base64").toString("utf8")
          : event.body
      );
    } catch {
      return json(400, { error: "request body must be JSON" });
    }
  }

  try {
    const taskId = path.match(/^\/tasks\/([^/]+)$/)?.[1];
    const reportDate = path.match(/^\/reports\/([^/]+)$/)?.[1];

    if (method === "GET" && path === "/tasks") return await listTasks();
    if (method === "POST" && path === "/tasks") return await createTask(body);
    if (method === "PATCH" && taskId) return await updateTask(taskId, body);
    if (method === "DELETE" && taskId) return await deleteTask(taskId);
    if (method === "GET" && path === "/reports") return await listReports();
    if (method === "GET" && reportDate) return await getReport(reportDate);
    if (method === "GET" && path === "/status") return await getStatus();
    if (method === "POST" && path === "/run") return await triggerRun();

    return json(404, { error: "no such route" });
  } catch (err) {
    console.error("API error:", err);
    return json(500, { error: "internal error" });
  }
}
