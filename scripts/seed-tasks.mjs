// Seeds orbit-tasks with plausible starter tasks derived from Joel's standing
// commitments (see CLAUDE.md). Edit titles/deadlines/importance to taste and
// re-run — it always inserts fresh items (new ULIDs), so wipe the table first
// if you want a clean slate.
//
// Usage: node scripts/seed-tasks.mjs   (uses default AWS credentials, us-east-1)
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";
import { fileURLToPath } from "node:url";

try {
  process.loadEnvFile(fileURLToPath(new URL("../.env", import.meta.url)));
} catch {
  // No .env — fine, table name defaults below.
}

const TABLE = process.env.TASKS_TABLE ?? "orbit-tasks";
// The status-deadline-index GSI is sparse on deadline, so deadline-less tasks
// get this sentinel; src/sources/tasks.mjs maps it back to null.
const NO_DEADLINE = "9999-12-31";
const now = new Date().toISOString();

const seed = (t) => ({
  id: ulid(),
  status: "todo",
  effort: "medium",
  deadline: NO_DEADLINE,
  createdAt: now,
  updatedAt: now,
  lastTouchedAt: now,
  ...t,
});

const TASKS = [
  seed({
    title: "Publish Weekend Agent Challenge article on AWS Builder Center",
    deadline: "2026-07-20",
    importance: 5,
    category: "aws-sbgl",
    effort: "deep",
    notes: "Title must contain 'Weekend Agent Challenge: Orbit AI', tag #agents, 500+ words, 5 sections, evidence screenshots. Deadline 1:00 PM PT.",
  }),
  seed({
    title: "Capture proof of unattended Orbit run (CloudWatch log + email screenshot)",
    deadline: "2026-07-19",
    importance: 5,
    category: "aws-sbgl",
    notes: "Needed as evidence in the challenge article.",
  }),
  seed({
    title: "Ship Kairo Labs MVP onboarding flow",
    deadline: "2026-07-31",
    importance: 4,
    category: "kairo-labs",
    effort: "deep",
    status: "in_progress",
    notes: "Blocking first pilot users.",
  }),
  seed({
    title: "Triage open issues across Kairo Labs repos",
    importance: 3,
    category: "kairo-labs",
    effort: "quick",
  }),
  seed({
    title: "Draft CITSA semester kickoff event proposal",
    deadline: "2026-07-24",
    importance: 3,
    category: "citsa",
  }),
  seed({
    title: "Schedule next AWS SBGL study-jam session",
    deadline: "2026-07-22",
    importance: 3,
    category: "aws-sbgl",
    effort: "quick",
  }),
  seed({
    title: "Follow up with TEDxUCC speaker shortlist",
    deadline: "2026-07-25",
    importance: 4,
    category: "tedxucc",
    notes: "Two speakers still unconfirmed.",
  }),
  seed({
    title: "Finish coursework assignment set",
    deadline: "2026-07-23",
    importance: 4,
    category: "coursework",
  }),
  seed({
    title: "Review research paper notes and outline next section",
    importance: 2,
    category: "research",
    effort: "deep",
  }),
  seed({
    title: "Complete AmaliTech Spring Boot module exercises",
    deadline: "2026-07-27",
    importance: 4,
    category: "amalitech",
    status: "in_progress",
    notes: "Part of the Spring Boot pivot track.",
  }),
];

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
await client.send(
  new BatchWriteCommand({
    RequestItems: {
      [TABLE]: TASKS.map((Item) => ({ PutRequest: { Item } })),
    },
  })
);
console.log(`Seeded ${TASKS.length} tasks into ${TABLE}:`);
for (const t of TASKS) {
  const dl = t.deadline === NO_DEADLINE ? "no deadline" : t.deadline;
  console.log(`  [${t.category}] ${t.title} (${t.status}, imp ${t.importance}, ${dl})`);
}
