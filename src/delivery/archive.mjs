// S3 archive: stores each run's briefing (reports/YYYY-MM-DD.md) and the
// context that produced it (reports/YYYY-MM-DD.context.json) as proof
// artifacts, and reads the previous run's "Top 3 Priorities" back for the
// next prompt so Orbit can notice non-movement.
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

const s3 = new S3Client({});
const PREFIX = "reports/";

export async function archiveReport({ bucket, date, briefing, context }) {
  const mdKey = `${PREFIX}${date}.md`;
  await Promise.all([
    s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: mdKey,
        Body: briefing,
        ContentType: "text/markdown; charset=utf-8",
      })
    ),
    s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: `${PREFIX}${date}.context.json`,
        Body: JSON.stringify(context, null, 2),
        ContentType: "application/json",
      })
    ),
  ]);
  return mdKey;
}

/** Extracts the "Top 3 Priorities" section from a stored briefing. */
export function extractTopPriorities(markdown) {
  const match = markdown.match(/##\s*Top 3 Priorities\s*\n([\s\S]*?)(?=\n##\s|$)/);
  return match ? match[1].trim() : null;
}

/**
 * Returns { date, topPriorities } from the most recent briefing strictly
 * before `date`, or null when there is no prior run.
 */
export async function getPreviousBriefing({ bucket, date }) {
  const listed = await s3.send(
    new ListObjectsV2Command({ Bucket: bucket, Prefix: PREFIX })
  );
  const previousKey = (listed.Contents ?? [])
    .map((o) => o.Key)
    .filter((k) => k.endsWith(".md") && k < `${PREFIX}${date}.md`)
    .sort()
    .at(-1);
  if (!previousKey) return null;

  const obj = await s3.send(
    new GetObjectCommand({ Bucket: bucket, Key: previousKey })
  );
  const body = await obj.Body.transformToString();
  return {
    date: previousKey.slice(PREFIX.length, -3),
    topPriorities: extractTopPriorities(body),
  };
}
