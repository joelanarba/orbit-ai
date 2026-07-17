# Orbit AI

Orbit is an always-on personal agent that wakes every morning at **6:00 AM Africa/Accra**, reads your tasks and work signals, ranks what matters, emails a briefing, and archives the run.

**Live demo:** [Orbit public showcase](http://orbit-ai-webbucket-usf0sxolvb5r.s3-website-us-east-1.amazonaws.com)  

## What it does

- Loads active tasks from DynamoDB
- Checks GitHub for failing CI, open pull requests, and recently dropped work
- Reads upcoming Google Calendar events and important unread Gmail messages
- Uses OpenAI to produce a five-section briefing: Focus, Top 3 Priorities, Deadline Radar, Stale Alerts, and Quick Wins
- Sends the briefing through Amazon SES and archives the report in S3
- Records scheduled and manual runs in CloudWatch

The public site uses synthetic data. The private dashboard adds live tasks, report history, and manual runs.

## Architecture

```
EventBridge Scheduler (cron 0 6 * * ? *, Africa/Accra)
        │
        ▼
Lambda (orbit-briefing)
        │
        ├── DynamoDB  → active tasks
        ├── GitHub    → owned repos, CI, PRs, stale signals (ranked shortlist)
        ├── Calendar  → today + next 7 days (optional OAuth)
        ├── Gmail     → unread / important highlights (optional OAuth)
        │
        ▼
OpenAI  → ranked five-section briefing
        │
        ├── SES  → email delivery
        └── S3   → report + context archive
        │
        ▼
CloudWatch → scheduled execution logs
```

A second Lambda (`orbit-dashboard-api`) serves the authenticated dashboard API over a Function URL. The React frontend is hosted as a static site on S3.

## AWS services

| Service | Role |
| --- | --- |
| EventBridge Scheduler | Daily unattended trigger at 6:00 Accra |
| Lambda | Orchestration + dashboard API |
| DynamoDB | Task store (`orbit-tasks`, GSI `status-deadline-index`) |
| SES | Briefing email |
| S3 | Report archive + static website |
| SSM Parameter Store | Secrets (`/orbit/*` SecureStrings) |
| CloudWatch Logs | Proof of scheduled execution |
| IAM | Least-privilege roles for Lambda and Scheduler |

## Features

- **Five-section briefing contract:** Focus, Top 3 Priorities, Deadline Radar, Stale Alerts, Quick Wins
- **GitHub auto-discovery** of owned personal repos (forks/archived skipped), with concurrency-capped enrichment
- **Compact GitHub ranking:** scans all repos, surfaces a shortlist of failing CI / open PRs / recently dropped work, and caps Stale Alerts so the email stays readable
- **Google Calendar + Gmail** via cached OAuth refresh token (soft-fail if unset)
- **Run provenance:** scheduled vs manual trigger archived with each report
- **Public showcase + synthetic demo** (no live API calls) and **private token dashboard**
- **Wake-receipt UI:** greeting, ranked priorities, source evidence, report history

## Repository layout

```
template.yaml                 SAM: Lambdas, DynamoDB, S3, Scheduler, IAM
src/handler.mjs               orchestrator: gather → reason → deliver → archive
src/api/handler.mjs           dashboard API (tasks, reports, status, run)
src/sources/                  tasks, github, calendar, gmail
src/reasoning/                prompt + getPriorityBriefing
src/delivery/                 SES email + S3 archive
src/lib/                      provenance helpers
web/                          Vite + React showcase and dashboard
scripts/                      local smoke tests, seed, Google OAuth setup, invoke
tests/                        Node test suite
tasks/todo.md                 build checklist and review log
```

## Quick start

### Prerequisites

- Node.js 22+
- AWS SAM CLI + credentials with permissions to deploy the stack
- OpenAI API key
- Optional: GitHub fine-grained PAT (Metadata, Contents, Issues, Pull requests, Actions — Read)
- Optional: Google Desktop OAuth client for Calendar/Gmail

### Local

```powershell
npm install
copy .env.example .env
# Fill OPENAI_API_KEY (and optional GitHub / Google values). Do not commit .env.
npm test
node scripts/test-openai.mjs
```

### Deploy

```powershell
sam build
sam deploy --stack-name orbit-ai --region us-east-1 --resolve-s3 --capabilities CAPABILITY_IAM --no-confirm-changeset --no-fail-on-empty-changeset
```

Push secrets to SSM Parameter Store (SecureString for keys/tokens). Seed tasks and invoke once:

```powershell
node scripts/seed-tasks.mjs
.\scripts\invoke-remote.ps1
```

### Frontend

```powershell
cd web
npm install
npm run build
# Sync web/dist to the stack's WebBucket (see CloudFormation WebsiteUrl output)
```

### Google sources (optional)

```powershell
# With GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in .env:
npm run setup:google
```

The script opens browser consent and writes the refresh token to SSM without printing it.

## Security

- Secrets live in SSM (`/orbit/*`), never in the repository
- Public demo uses **bundled synthetic data only** — no live API calls
- Private dashboard requires `x-orbit-token` matching SSM `/orbit/dashboard-token`
- Report archive bucket stays private; only the website bucket is public-read for static assets
- GitHub access is read-only; Google context lookups store mapped fields via OAuth refresh token in SSM

## Verification

```powershell
npm test
# Expected: all tests pass (currently 16)
```

Also verify:

- `aws scheduler get-schedule --name orbit-daily-briefing` → Enabled, cron `0 6 * * ? *`, timezone `Africa/Accra`
- A scheduled CloudWatch log around 06:00 with a successful gather → archive → email path
- The live showcase opens without a token; private routes return 401 without the dashboard token
