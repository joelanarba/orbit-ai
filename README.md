# Orbit AI

Always-on personal agent for the AWS Builder Center "Build an Always-On Agent" weekend challenge.

Core loop: **EventBridge Scheduler → Lambda → (DynamoDB tasks + GitHub activity) → OpenAI reasoning → SES briefing email + S3 archive**, with CloudWatch logs as proof the run fired unattended.

## Stack

- Node.js 22, plain ESM JavaScript, AWS SAM
- DynamoDB `orbit-tasks` (GSI `status-deadline-index`), S3 report archive, SES delivery
- OpenAI `gpt-4o-mini` behind a single `getPriorityBriefing(context)` function (provider-swappable)
- Secrets in SSM Parameter Store SecureStrings (`/orbit/*`), never in the repo

## Layout

```
template.yaml            SAM: Lambda, DynamoDB, S3, IAM
src/handler.mjs          orchestrator: gather → reason → deliver → archive
src/sources/             tasks (DynamoDB), github, calendar + gmail (phase-2 stubs)
src/reasoning/           prompt builders + the OpenAI call
src/delivery/            SES email + S3 archive
scripts/                 test-openai.mjs, seed-tasks.mjs, invoke-remote.ps1
tasks/todo.md            live build checklist (incl. blocked items)
```

## Quick start

```powershell
npm install
copy .env.example .env        # paste OPENAI_API_KEY, then:
node scripts/test-openai.mjs  # smoke-test the reasoning call locally

sam build; sam deploy         # stack: orbit-ai (us-east-1)
node scripts/seed-tasks.mjs   # load starter tasks into DynamoDB
.\scripts\invoke-remote.ps1   # manual end-to-end run
```

See `tasks/todo.md` for the full checklist and the SSM/SES setup commands.
