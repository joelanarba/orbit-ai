# Orbit AI — Always-On Personal Agent
### AWS Builder Center "Build an Always-On Agent" Weekend Challenge

**Challenge window:** July 17, 2026 12:00 AM PT → July 20, 2026 1:00 PM PT
**Prize:** First 100 qualifying submissions get an AWS Builder Jacket (Pass/Fail across 3 categories)

---

## 1. Project Vision

Joel juggles too many moving pieces at once (Kairo Labs, CITSA, AWS SBGL, TEDxUCC, coursework,
research, the AmaliTech Spring Boot pivot) and needs an agent that remembers, watches, and
surfaces what matters — without being asked. Not a task app you open. A background presence.

**Core loop:** wake on a schedule → pull from multiple sources → reason about priority →
produce a briefing → deliver it → log the run for proof for the judges.

## 2. Scope (full, not cut down)

All four sources are in scope:

1. **Task DB** — DynamoDB table of tasks (id, title, deadline, importance, status, category)
2. **GitHub** — checks commit/issue activity across Kairo Labs repos, flags stale projects
   (e.g. "You haven't touched Kairo Labs in 14 days")
3. **Google Calendar** — meetings, deadlines, events (OAuth — build this after 1 & 2 are solid)
4. **Gmail** — unread important emails / things needing replies (OAuth — build last)

Build order matters more than build completeness on day one: get Task DB + GitHub +
scheduled trigger + reasoning + delivery working end-to-end FIRST, so there's always a
demoable, qualifying submission on the table. Calendar and Gmail get layered on once the
core loop is proven, not before.

## 3. Model / Reasoning Layer

**Use OpenAI (not Bedrock)** for the prioritization/reasoning step. Bedrock hit a token quota
wall on BuilderOS — don't repeat that mistake this weekend when time is the scarce resource.

- Keep the reasoning call behind a single interface/function (e.g. `getPriorityBriefing(context)`)
  so the provider is swappable later without touching the rest of the pipeline.
- The AWS "uses at least one AWS service" requirement is satisfied independently by
  EventBridge, Lambda, DynamoDB, SES, S3, CloudWatch — OpenAI doing the reasoning does not
  jeopardize Category 3 eligibility.

## 4. Architecture

```
EventBridge Scheduler (cron, e.g. 6 AM daily)
        │
        ▼
Lambda (orchestrator)
        │
        ├── DynamoDB  → tasks, preferences, goals, history
        ├── GitHub API → recent commits / stale repos / open issues
        ├── Google Calendar API → today's + upcoming events   (phase 2)
        ├── Gmail API → unread/important threads              (phase 2)
        │
        ▼
OpenAI API (reasoning: rank by deadline, importance, prior progress, goals)
        │
        ▼
Generate briefing (text)
        │
        ├── SES → email briefing to Joel
        └── S3  → store the generated report (proof artifact for judges)
        │
        ▼
CloudWatch → logs + scheduled execution history (screenshot this for the article)
```

## 5. AWS Services Checklist (Category 3 gate)

- [ ] EventBridge Scheduler — triggers the run without human action
- [ ] Lambda — orchestration logic
- [ ] DynamoDB — task/state storage
- [ ] SES — delivers the briefing
- [ ] S3 — stores generated reports (also your "proof" screenshots/artifacts)
- [ ] CloudWatch — logs, used as evidence the trigger fired unattended

## 6. Submission Requirements (do not lose points on Completeness)

- [ ] Article title contains: `Weekend Agent Challenge: [Name of Agent]`
- [ ] Article tag: `#agents`
- [ ] Article ≥ 500 words, covers all 5 required sections (Vision & What It Does /
      How You Built It / AWS Services & Architecture / What You Learned / Link to App or Repo)
- [ ] Working deployed link OR public GitHub repo
- [ ] Screenshot/video evidence of: schedule firing unattended + the resulting output
      (CloudWatch log timestamp + the email/report is the easiest proof)
- [ ] Published within the challenge window (July 17 12:00 AM PT – July 20 1:00 PM PT —
      double-check the PT→GMT conversion against Joel's local time before treating any
      deadline as fixed)

## 7. Working Style (applies to all non-trivial work on this project)

**Planning & execution**
- Enter plan mode for any non-trivial step (3+ steps or an architectural decision — e.g.
  adding Calendar/Gmail OAuth counts, wiring the Lambda handler does not).
- Maintain `tasks/todo.md` with checkable items; check in with Joel before starting
  implementation on anything not already agreed in this file.
- Mark items complete as work proceeds; write a short review in `tasks/todo.md` when a
  phase finishes.
- If something goes sideways (quota error, auth failure, scope creep), STOP and re-plan —
  don't keep pushing on the broken path.

**Subagents & compute**
- Offload research/exploration (e.g. "what's the simplest GitHub API call for stale-repo
  detection") to subagents. One focused task per subagent.

**Learning & corrections**
- After any correction from Joel, add the pattern to `tasks/lessons.md` with a rule that
  prevents it recurring. Review `tasks/lessons.md` at the start of each session.

**Verification & quality**
- Never mark a task done without proving it: run it, show the log, show the email/report
  that came out.
- Ask "would a staff engineer approve this?" before calling something finished.

**Elegance & simplicity**
- Before non-trivial changes, pause and ask if there's a more elegant way.
- Minimal-impact changes only — touch what's necessary, nothing more.

**Bug resolution**
- Fix it, don't hand-hold. Root-cause it. No temporary patches.

**Communication**
- Give a high-level summary of what changed at each step, not a play-by-play.

## 8. Timeline (weekend, Ghana time — verify PT offset before treating as fixed)

- **Fri (setup):** confirm OpenAI API access works end-to-end tonight, not Saturday morning.
  Lock DynamoDB schema. Get a bare Lambda deployed and triggerable manually.
- **Sat:** Task DB CRUD + GitHub activity check + reasoning prompt + SES delivery, wired to
  EventBridge. Get ONE real scheduled run firing and captured (CloudWatch + email screenshot).
- **Sun:** Layer in Calendar, then Gmail if time allows. Draft the article early — don't
  leave all 500+ words and 5 sections to Monday.
- **Mon (buffer):** final proof screenshots, article polish, submit before 1:00 PM PT.
