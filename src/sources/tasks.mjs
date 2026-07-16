// DynamoDB task source. Queries the status-deadline-index GSI (PK: status,
// SK: deadline) once per active status, so we never scan the table.
//
// The GSI is sparse on `deadline`, so the seed script writes the sentinel
// "9999-12-31" for tasks with no deadline; we map it back to null here.
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

export const NO_DEADLINE_SENTINEL = "9999-12-31";

const ACTIVE_STATUSES = ["todo", "in_progress", "blocked"];

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export async function getActiveTasks({ tableName }) {
  const results = await Promise.all(
    ACTIVE_STATUSES.map((status) =>
      client.send(
        new QueryCommand({
          TableName: tableName,
          IndexName: "status-deadline-index",
          KeyConditionExpression: "#s = :status",
          ExpressionAttributeNames: { "#s": "status" },
          ExpressionAttributeValues: { ":status": status },
        })
      )
    )
  );

  const tasks = results
    .flatMap((r) => r.Items ?? [])
    .map((t) => ({
      ...t,
      deadline: t.deadline === NO_DEADLINE_SENTINEL ? null : t.deadline,
    }));

  // Earliest real deadline first; deadline-less tasks last.
  tasks.sort((a, b) =>
    (a.deadline ?? NO_DEADLINE_SENTINEL).localeCompare(
      b.deadline ?? NO_DEADLINE_SENTINEL
    )
  );
  return tasks;
}
