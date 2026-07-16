// Tonight's smoke test: proves the OpenAI key works end-to-end through the
// real briefing pipeline (same prompt, model, and code path as the Lambda).
//
// Usage:  copy .env.example -> .env, paste OPENAI_API_KEY, then:
//         npm install && node scripts/test-openai.mjs
import { fileURLToPath } from "node:url";
import { getPriorityBriefing } from "../src/reasoning/briefing.mjs";

try {
  process.loadEnvFile(fileURLToPath(new URL("../.env", import.meta.url)));
} catch {
  // No .env yet — fall through and rely on the environment.
}

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error(
    "OPENAI_API_KEY not set. Copy .env.example to .env and paste your key."
  );
  process.exit(1);
}

const sampleContext = {
  today: { date: "2026-07-17", dayOfWeek: "Friday", timezone: "Africa/Accra" },
  tasks: [
    {
      id: "smoke-1",
      title: "Submit Weekend Agent Challenge article",
      deadline: "2026-07-20",
      importance: 5,
      status: "todo",
      category: "aws-sbgl",
      effort: "deep",
      notes: "Must publish before 1 PM PT Monday.",
    },
    {
      id: "smoke-2",
      title: "Reply to TEDxUCC speaker email",
      deadline: null,
      importance: 3,
      status: "todo",
      category: "tedxucc",
      effort: "quick",
    },
  ],
  github: [
    {
      repo: "kairo-labs/demo",
      lastCommitDate: "2026-06-28T10:00:00Z",
      daysStale: 19,
      isStale: true,
      openIssueCount: 4,
      recentCommits: [
        { date: "2026-06-28T10:00:00Z", message: "Fix onboarding flow" },
      ],
    },
  ],
  calendar: null,
  gmail: null,
  previousBriefing: null,
};

console.log("Calling OpenAI (gpt-4o-mini) with a sample context...\n");
const started = Date.now();
const briefing = await getPriorityBriefing(sampleContext, { apiKey });
console.log(briefing);
console.log(`\n--- OK: briefing generated in ${Date.now() - started} ms ---`);
