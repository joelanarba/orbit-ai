# Orbit AI — Build Todo

Mirrors the approved plan (`orbit_ai_build_plan_811ee433`). Checked = done and verified.

## Phase 1 — Core loop

- [x] Create `tasks/todo.md` + `tasks/lessons.md` stub
- [x] Scaffold SAM project (template.yaml, package.json, .gitignore, src/, scripts/, events/)
- [x] `git init` + initial commits
- [x] Implement `src/sources/tasks.mjs` — DynamoDB query via `status-deadline-index` GSI
- [x] Implement `src/sources/github.mjs` — recent commits, open issues, >14d stale flags
- [x] GitHub auto-discovery — PAT → `GET /user/repos?type=owner` (paginate, skip forks/archived); `GITHUB_REPOS` optional override only
- [x] Enrich GitHub source — open PRs (count + titles), recent Actions run conclusions, lastPushDate; concurrency cap; prompt aware of CI/PRs/stale
- [x] Implement `src/sources/calendar.mjs` + `src/sources/gmail.mjs` — phase-2 stubs (return null)
- [x] Implement `src/reasoning/prompt.mjs` + `src/reasoning/briefing.mjs` — `getPriorityBriefing(context)`, gpt-4o-mini, 5-section markdown contract
- [x] Implement `src/delivery/email.mjs` — SES send (text + minimal HTML)
- [x] Implement `src/delivery/archive.mjs` — S3 `reports/YYYY-MM-DD.md` + context JSON + read previous briefing top-3
- [x] Wire `src/handler.mjs` orchestrator (gather → reason → deliver → archive)
- [x] Write `scripts/test-openai.mjs` (local smoke test against `.env`) — **PASSED 2026-07-16**: gpt-4o-mini generated a full 5-section briefing in ~5.3s
- [x] Write `scripts/seed-tasks.mjs` (starter tasks from Joel's commitments)
- [x] Write `scripts/invoke-remote.ps1` (manual Lambda invoke)
- [x] `sam validate` + `node --check` all modules — all 12 modules pass, template valid
- [x] `sam build` + `sam deploy` — stack `orbit-ai` deployed to us-east-1 (Lambda `orbit-briefing`, table `orbit-tasks` + GSI, bucket `orbit-ai-reportsbucket-1ewyhjz5rbop`)
- [x] Run `scripts/seed-tasks.mjs` against deployed table and verify items exist — 10 items seeded; scan count = 10; GSI query (`status = todo`) = 8

## BLOCKED ON JOEL — CLEARED 2026-07-16

All three done: `.env` populated + keys pushed to SSM (`/orbit/openai-api-key`,
`/orbit/github-token` SecureString; `/orbit/briefing-email` String — `/orbit/github-repos`
skipped, auto-discovery in use), and SES identity `anarbajoel@gmail.com` verified
(status: Success). Original instructions kept below for reference.

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

### 2. GitHub PAT (needed for the GitHub source)

Create a fine-grained PAT at https://github.com/settings/personal-access-tokens for **your user account** on all personal repositories (or “All repositories”). Grant these **read-only** repository permissions:

| Permission | Access |
|---|---|
| Metadata | Read |
| Contents | Read |
| Issues | Read |
| Pull requests | Read |
| Actions | Read |

Orbit auto-discovers every owned non-fork, non-archived repo via `GET /user/repos`, then per repo pulls recent commits, open issues, open PRs, recent Actions runs, and push/stale signals. Then:

```powershell
aws ssm put-parameter --name /orbit/github-token --type SecureString --value "github_pat_REPLACE_ME" --overwrite
```

That is the only GitHub SSM param required. `/orbit/github-repos` is an **optional override** (comma-separated `owner/repo`) if you ever want to pin a subset instead of scanning everything:

```powershell
# Optional — skip this unless you want a fixed list
aws ssm put-parameter --name /orbit/github-repos --type String --value "owner/repo-one,owner/repo-two" --overwrite
```

(For local scripts: `GITHUB_TOKEN` required in `.env`; `GITHUB_REPOS` / `GITHUB_USER` optional.)

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

- [x] Manual end-to-end Lambda invoke (`scripts/invoke-remote.ps1`) — verified 2026-07-16: gather (10 tasks, 116 repos) → reason → archive (`reports/2026-07-16.md` + context JSON in S3) → deliver (SES message id `0100019f6ccd3731-…`, `emailed: true`)
- [x] Add EventBridge Scheduler (6 AM `Africa/Accra`, SAM `ScheduleV2`) — **DEPLOYED
  2026-07-16** after Joel attached `orbit-scheduler` to `builderos-admin`. Verified live via
  `aws scheduler get-schedule`: `orbit-daily-briefing`, state ENABLED, `cron(0 6 * * ? *)`,
  tz `Africa/Accra`, target `orbit-briefing` Lambda. Remaining proof = tomorrow's 6 AM
  unattended run screenshots
- [ ] Capture first unattended run — the remaining proof step: tomorrow's 6 AM run, CloudWatch
  log timestamp + email screenshot (article evidence)

## Frontend — Orbit dashboard (web/)

- [x] Dashboard API Lambda `src/api/handler.mjs` (`orbit-dashboard-api`, Function URL):
      tasks CRUD (DynamoDB), reports list/fetch (S3 + context-JSON signal summary),
      run status (last/next run), `POST /run` async-invokes `orbit-briefing`
- [x] Auth: `x-orbit-token` header checked against SSM SecureString `/orbit/dashboard-token`
      (generated 2026-07-16, never printed; retrieve with
      `aws ssm get-parameter --name /orbit/dashboard-token --with-decryption`)
- [x] `WebBucket` S3 static website hosting + public-read policy in template
- [ ] `sam deploy` with API + web bucket — verify Function URL responds
- [x] `web/` Vite + React app: token gate, Briefing view (markdown report + repo
      signals + history), Tasks view (grouped list, add/edit/complete/delete),
      run status + Run now in the top bar
- [ ] `npm run build` + sync `web/dist` to WebBucket — verify site serves
- [ ] Exercise deployed API with real calls (tasks list, latest report, status)

### Blocker discovered 2026-07-16 (needs Joel)

`builderos-admin` lacks EventBridge Scheduler permissions, so the ScheduleV2 event
fails stack deploys (`scheduler:GetSchedule` AccessDenied → full rollback). The
schedule is commented out in `template.yaml` for now. To re-enable, attach a policy
with `scheduler:CreateSchedule/GetSchedule/UpdateSchedule/DeleteSchedule` (resource
`arn:aws:scheduler:*:*:schedule/default/orbit-*`) plus `iam:CreateRole/PassRole` for
the scheduler execution role, then uncomment and redeploy.

## Phase 2 — Google Calendar + Gmail

- [x] Add shared Google OAuth refresh-token client with one cold-start token cache
- [x] Replace Calendar stub — primary calendar, today + next 7 days, Africa/Accra,
      timed/all-day event mapping, nullable soft-fail
- [x] Replace Gmail stub — max 15 unread important/inbox messages, metadata-only detail
      fetches, nullable soft-fail
- [x] Feed Calendar/Gmail into the existing five-section OpenAI prompt without changing
      the response contract
- [x] Enrich archived-context dashboard API signals with `calendarEvents` and
      `emailHighlights` (no new UI chrome)
- [x] Add one-time `scripts/google-oauth-setup.mjs`; it opens consent and writes the
      refresh token directly to SSM without printing it
- [x] Deploy Phase 2 SAM changes and verify the no-credentials soft-fail path
- [x] Create dedicated GCP project `orbit-ai-anarbajoel` and enable Service Usage,
      Cloud Resource Manager, Google Calendar, and Gmail APIs
- [ ] Complete Google OAuth setup below, then invoke a real Google-backed briefing

### BLOCKED ON JOEL — Google Auth Platform console step

The automatable setup was completed 2026-07-16: authenticated account
`anarbajoel@gmail.com`, active project `orbit-ai-anarbajoel`, and required APIs enabled.
Google does not expose public tooling for creating the required External/Testing consent
configuration and Desktop OAuth client; the `gcloud iap oauth-*` commands create IAP
credentials and are not interchangeable with Google API Desktop credentials.

1. Open https://console.cloud.google.com/auth/overview?project=orbit-ai-anarbajoel.
2. Configure **Google Auth Platform**:
   - Choose **External** audience.
   - Set app name to **Orbit AI**.
   - Set support/developer email to `anarbajoel@gmail.com`.
   - Complete the required app/contact fields.
   - Keep publishing status **Testing**.
   - Add `anarbajoel@gmail.com` under **Audience → Test users**.
   - Add these read-only scopes under **Data Access**:
     - `https://www.googleapis.com/auth/calendar.readonly`
     - `https://www.googleapis.com/auth/gmail.readonly`
3. Open **Clients → Create client → Desktop app**. Download or copy its client ID and
   client secret. Save them only in the gitignored local `.env`:

   ```powershell
   GOOGLE_CLIENT_ID=REPLACE_WITH_DESKTOP_CLIENT_ID
   GOOGLE_CLIENT_SECRET=REPLACE_WITH_DESKTOP_CLIENT_SECRET
   ```

4. From `c:\dev\Projects\orbit ai`, with the AWS CLI signed in as the same account that
   owns stack `orbit-ai`, run:

   ```powershell
   npm install
   npm run setup:google
   ```

   Approve both read-only scopes in the browser. The script receives the loopback
   callback and writes one SecureString, `/orbit/google-oauth`, in `us-east-1`.
   It does not print the client secret or refresh token.

5. Confirm only that the parameter exists (do not decrypt or print it):

   ```powershell
   aws ssm get-parameter --name /orbit/google-oauth --region us-east-1 --query "Parameter.Name" --output text
   ```

6. Invoke Orbit and confirm the logs show non-zero Google signal counts:

   ```powershell
   .\scripts\invoke-remote.ps1
   ```

   Expected gather log shape: `calendar=N events, gmail=N messages`. The archived
   `reports/YYYY-MM-DD.context.json` and dashboard report API then carry those signals.

## Review log

**2026-07-16 — Scaffold + deploy phase complete.** Full core-loop code implemented and
deployed (stack `orbit-ai`, us-east-1). Verified: `sam validate` clean, all modules pass
`node --check`, table seeded with 10 tasks (scan = 10, GSI query works), and a manual
Lambda invoke confirmed the pipeline runs correctly through the gather phase
("Gathered context: 10 tasks, github=off, previousBriefing=none" in CloudWatch) before
failing exactly where expected — the missing OpenAI key. Remaining work is blocked on
Joel's three inputs above; after those, do the manual end-to-end run, then add the
EventBridge schedule.

**2026-07-16 — GitHub auto-discovery.** `github.mjs` now lists all owned personal repos
via the PAT (`GET /user/repos?type=owner`, skip forks/archived) when `GITHUB_REPOS` /
`/orbit/github-repos` is unset. Joel only needs `/orbit/github-token` for GitHub.
EventBridge schedule still OFF.

**2026-07-16 — Blockers cleared + first end-to-end run.** Joel supplied `.env` (OpenAI key,
GitHub PAT, briefing email) and added IAM policy `orbit-ssm-ses` to `builderos-admin`.
Local smoke test passed (~5.3s). Secrets pushed to SSM, SES identity verified (Joel clicked
the link within a minute). Manual Lambda invoke succeeded end-to-end: 10 tasks + 116 GitHub
repos gathered, briefing reasoned, report archived to
`s3://orbit-ai-reportsbucket-1ewyhjz5rbop/reports/2026-07-16.md`, email delivered
(SES message id `0100019f6ccd3731-ec66397d-…`). Run took ~60s / 161 MB. Next: EventBridge
schedule, then capture the first unattended run for the article.

**2026-07-16 — GitHub enrichment.** Per-repo snapshot now includes open PR count/titles,
recent Actions conclusions (`failingCi`), and `lastPushDate` from discovery. Repo checks
run with concurrency 5; PR/Actions endpoint failures soft-fail. Fine-grained PAT needs
Metadata + Contents + Issues + Pull requests + Actions (all Read). Prompt feeds these
into the existing 5-section briefing. EventBridge still OFF.

**2026-07-16 — EventBridge schedule added to template; deploy blocked on IAM.**
`template.yaml` now defines a `ScheduleV2` event `orbit-daily-briefing` on the briefing
Lambda: `cron(0 6 * * ? *)`, `ScheduleExpressionTimezone: Africa/Accra` (next fire:
tomorrow 6:00 AM Accra). `sam validate --lint` and `sam build` pass. `sam deploy` created
the changeset (schedule + its invoke role) but CloudFormation **rolled back**:
`builderos-admin` is denied `scheduler:GetSchedule` (no EventBridge Scheduler permissions),
and the user cannot self-grant (`iam:PutUserPolicy` also denied). Stack is back at its
previous healthy state; the deployed Lambda/table/bucket are untouched. Unblock: Joel
attaches `scripts/iam-orbit-scheduler-policy.json` (scoped to `orbit-*` schedules +
PassRole to scheduler.amazonaws.com) in the IAM console, then redeploy and verify with
`aws scheduler get-schedule --name orbit-daily-briefing`. After that, the only remaining
proof step is capturing tomorrow's 6 AM unattended run (CloudWatch log timestamp + email
screenshot for the article).

**2026-07-16 — EventBridge schedule deployed and verified.** Joel attached the
`orbit-scheduler` policy to `builderos-admin`; `aws scheduler list-schedules` now succeeds.
Uncommented the `DailyBriefing` ScheduleV2 event in `template.yaml`, waited out a concurrent
dashboard deploy on the same stack (settled at UPDATE_COMPLETE), then `sam build` +
`sam deploy` succeeded — CloudFormation created the schedule + its invoke role. Verified via
`aws scheduler get-schedule`: `orbit-daily-briefing` is **ENABLED**, `cron(0 6 * * ? *)`,
timezone `Africa/Accra`, target `arn:aws:lambda:us-east-1:…:function:orbit-briefing`.
Core loop is now fully autonomous. Last remaining Phase 1 item: capture tomorrow's 6:00 AM
Accra unattended run (CloudWatch timestamp + email screenshot) as article evidence.

**2026-07-16 — Phase 2 Google integrations deployed; OAuth pending.** Calendar and Gmail
now use a shared cached OAuth refresh-token flow backed by `/orbit/google-oauth`, feed
structured signals into the unchanged five-section briefing prompt, and remain optional.
Tests passed (6/6), SAM validation/build/deploy passed, and `orbit-ai` returned
`UPDATE_COMPLETE`. A real no-OAuth Lambda run returned 200, archived the report/context,
and sent email; its gather log showed `calendar=off, gmail=off`, and archived context
contained both as null. Lambda timeout is now 180 seconds. Google-backed verification is
blocked only on Joel completing the one-time consent checklist above.
