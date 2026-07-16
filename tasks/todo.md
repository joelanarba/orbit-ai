# Orbit AI — Build Todo

Mirrors the approved plan (`orbit_ai_build_plan_811ee433`). Checked = done and verified.

## Phase 1 — Core loop

- [x] Create `tasks/todo.md` + `tasks/lessons.md` stub
- [x] Scaffold SAM project (template.yaml, package.json, .gitignore, src/, scripts/, events/)
- [x] `git init` + initial commits
- [x] Implement `src/sources/tasks.mjs` — DynamoDB query via `status-deadline-index` GSI
- [x] Implement `src/sources/github.mjs` — recent commits, open issues, >14d stale flags
- [x] Implement `src/sources/calendar.mjs` + `src/sources/gmail.mjs` — phase-2 stubs (return null)
- [x] Implement `src/reasoning/prompt.mjs` + `src/reasoning/briefing.mjs` — `getPriorityBriefing(context)`, gpt-4o-mini, 5-section markdown contract
- [x] Implement `src/delivery/email.mjs` — SES send (text + minimal HTML)
- [x] Implement `src/delivery/archive.mjs` — S3 `reports/YYYY-MM-DD.md` + context JSON + read previous briefing top-3
- [x] Wire `src/handler.mjs` orchestrator (gather → reason → deliver → archive)
- [x] Write `scripts/test-openai.mjs` (local smoke test against `.env`) — *code ready; actual OpenAI call blocked on key*
- [x] Write `scripts/seed-tasks.mjs` (starter tasks from Joel's commitments)
- [x] Write `scripts/invoke-remote.ps1` (manual Lambda invoke)
- [x] `sam validate` + `node --check` all modules — all 12 modules pass, template valid
- [x] `sam build` + `sam deploy` — stack `orbit-ai` deployed to us-east-1 (Lambda `orbit-briefing`, table `orbit-tasks` + GSI, bucket `orbit-ai-reportsbucket-1ewyhjz5rbop`)
- [x] Run `scripts/seed-tasks.mjs` against deployed table and verify items exist — 10 items seeded; scan count = 10; GSI query (`status = todo`) = 8

## BLOCKED ON JOEL — do these tonight

Nothing below can be done by the agent. Exact commands included.

### 1. OpenAI API key (needed for smoke test + Lambda reasoning)

Create a key at https://platform.openai.com/api-keys (confirm billing/credits active), then:

- **Local smoke test:** copy `.env.example` to `.env`, paste the key as `OPENAI_API_KEY=sk-...`, then run:

  ```powershell
  npm install
  node scripts/test-openai.mjs
  ```

- **Lambda (SSM SecureString):**

  ```powershell
  aws ssm put-parameter --name /orbit/openai-api-key --type SecureString --value "sk-REPLACE_ME" --overwrite
  ```

### 2. GitHub PAT + repo list (needed for the GitHub source)

Create a fine-grained PAT at https://github.com/settings/personal-access-tokens — read-only **Contents + Metadata + Issues** on the Kairo Labs repos/org. Then:

```powershell
aws ssm put-parameter --name /orbit/github-token --type SecureString --value "github_pat_REPLACE_ME" --overwrite
```

Decide which repos to watch (comma-separated `owner/repo`) and set them:

```powershell
aws ssm put-parameter --name /orbit/github-repos --type String --value "kairo-labs/repo-one,kairo-labs/repo-two" --overwrite
```

(For local scripts, the same values can go in `.env` as `GITHUB_TOKEN` and `GITHUB_REPOS`.)

### 3. SES identity verification (needed before any email can send)

Decide which address gets the briefings, then run (replace the address):

```powershell
aws ses verify-email-identity --email-address you@example.com
```

Click the verification link AWS sends to that inbox. Then set the address for the Lambda:

```powershell
aws ssm put-parameter --name /orbit/briefing-email --type String --value "you@example.com" --overwrite
```

(SES sandbox is fine — sender and recipient are the same verified address.)

## Phase 1 — after blockers cleared

- [ ] Manual end-to-end Lambda invoke (`scripts/invoke-remote.ps1`) — verify email received + S3 report written
- [ ] Add EventBridge Scheduler (6 AM `Africa/Accra`, SAM `ScheduleV2`) — **only after** verified manual run
- [ ] Capture first unattended run: CloudWatch log timestamp + email screenshot (article evidence)

## Phase 2 (later)

- [ ] Google Calendar source (OAuth)
- [ ] Gmail source (OAuth)

## Review log

**2026-07-16 — Scaffold + deploy phase complete.** Full core-loop code implemented and
deployed (stack `orbit-ai`, us-east-1). Verified: `sam validate` clean, all modules pass
`node --check`, table seeded with 10 tasks (scan = 10, GSI query works), and a manual
Lambda invoke confirmed the pipeline runs correctly through the gather phase
("Gathered context: 10 tasks, github=off, previousBriefing=none" in CloudWatch) before
failing exactly where expected — the missing OpenAI key. Remaining work is blocked on
Joel's three inputs above; after those, do the manual end-to-end run, then add the
EventBridge schedule.
