# Weekend Agent Challenge: Orbit

**Tag:** `#agents`

---

## Vision & What It Does

I do not have one job. I have several commitments that all claim to be urgent at the same time: a startup, student leadership work, AWS community responsibilities, TEDxUCC, coursework, research, and a professional pivot into Spring Boot. Task lists help when I open them. They do not help when I am already behind and the day has started without a clear first move.

Orbit is the agent I wanted instead: a background presence that wakes before me, reads the work around me, decides what matters, and hands me a finished briefing. Not a chatbot I have to prompt. Not another dashboard I have to remember to check. An always-on loop.

Every morning at 6:00 AM Africa/Accra time, Orbit:

1. Loads active tasks from DynamoDB
2. Scans GitHub activity across my owned repositories
3. Pulls upcoming Google Calendar events and unread Gmail highlights when OAuth is configured
4. Asks OpenAI to rank priorities against deadlines, importance, and staleness
5. Emails a five-section briefing through Amazon SES
6. Archives the markdown report and the context that produced it to Amazon S3
7. Leaves a CloudWatch log trail proving the run fired without a human click

The briefing always uses the same contract: **Focus**, **Top 3 Priorities**, **Deadline Radar**, **Stale Alerts**, and **Quick Wins**. That fixed shape matters. Judges can read it. I can skim it. The dashboard can parse it.

There is also a public face. The live site opens into a product showcase and a synthetic demo so reviewers can explore Orbit without my private token. Private mode still exists for the real ledger, report history, and manual “Run now.”

**[Insert image: 6 AM briefing email]**  
*Caption: Orbit’s unattended morning briefing, delivered by SES at 6:00 Accra time.*

**[Insert image: public Orbit showcase]**  
*Caption: The public showcase — ranked briefing preview without private credentials.*

---

## How You Built It

I built Orbit as an AWS SAM application in Node.js 22, with a deliberate order of work: prove the unattended loop first, then layer sources, then polish the public experience.

### Core loop first

The orchestrator Lambda gathers sources in parallel, reasons, archives, then emails. Archive happens before SES on purpose. If delivery fails, the report still exists as proof.

Tasks live in DynamoDB with a status/deadline GSI so Orbit can query what is still in play. GitHub started as a small activity check and grew into authenticated auto-discovery of every owned personal repository, skipping forks and archived projects. Per-repo enrichment pulls recent commits, open issues and pull requests, and recent Actions conclusions, with concurrency capped so Lambda stays inside timeout.

Reasoning is intentionally isolated behind a single function, `getPriorityBriefing(context)`. The rest of the pipeline passes in context and receives markdown, without depending on provider-specific code. That kept the orchestration simple and made the reasoning layer easy to test or replace.

### The schedule that had to work

The always-on claim is not marketing copy. EventBridge Scheduler runs `orbit-daily-briefing` on `cron(0 6 * * ? *)` in `Africa/Accra`, with input that marks the trigger as `scheduled`. Getting that schedule deployed required a real IAM correction: the deploy user initially lacked Scheduler permissions, so CloudFormation rolled back. Once the scoped policy was attached, the schedule enabled cleanly.

On 17 July 2026 the unattended run fired. CloudWatch showed the Lambda start around 06:00 UTC with a Scheduled Event from EventBridge Scheduler. SES delivered the briefing. That is the proof this is an agent that acts without being asked.

### Calendar, Gmail, and ranking under load

Phase 2 added Google Calendar and Gmail through a one-time Desktop OAuth flow. The refresh token is written to SSM and never printed. Both sources soft-fail if credentials are missing, so the morning loop still completes.

Then the email got too long. With roughly 116 owned repositories, “Stale Alerts” tried to list nearly everything older than fourteen days. The fix was not “tell the model to be shorter” and hope. Orbit now scans all repositories, keeps headline counts, and sends the model a ranked shortlist of only the actionable repos: failing CI, open pull requests, and recently dropped work. The prompt caps Stale Alerts at five items plus a “+N more” line. The next briefing dropped to a readable size while still telling the truth about breadth.

### The public product

Finally I shipped a React dashboard and then a public showcase on top of it. Reviewers land on a visitor-facing story of the loop, open a synthetic demo without credentials, or enter a private token for the live desk. The dashboard shows a wake receipt, ranked priorities, source evidence, and report history. Theme preference, loading states, and demo safeguards are part of that polish because a working agent still needs a face people can trust.

---

## AWS Services & Architecture

Orbit is a scheduled serverless pipeline:

| Service | Responsibility |
| --- | --- |
| **EventBridge Scheduler** | Fires daily at 6:00 Accra without human action |
| **Lambda** | Orchestrates gather → reason → archive → deliver; separate Function URL for the dashboard API |
| **DynamoDB** | Stores tasks Orbit ranks from |
| **SES** | Delivers the morning email |
| **S3** | Archives each report and context JSON; hosts the static website |
| **SSM Parameter Store** | Holds secrets as SecureStrings |
| **CloudWatch Logs** | Records that the scheduled run happened |
| **IAM** | Grants the Lambdas and Scheduler only the actions they need |

OpenAI performs the ranking step. That does not replace AWS in the architecture; it sits behind one swappable interface while AWS owns the always-on trigger, storage, delivery, and evidence trail.

The frontend is a Vite + React app. Public visitors see synthetic demo data only. Authenticated requests to the dashboard API must carry a shared token checked against SSM. Report archives remain private even though the website bucket is public for static assets.

---

## What You Learned

Three lessons mattered more than any feature checklist.

**Keep reasoning behind one boundary.** One function owns the model call and briefing contract. The scheduler, sources, delivery, and archive layers do not depend on provider-specific code.

**Least privilege can block the demo until it is fixed correctly.** The EventBridge schedule existed in the template before the IAM user could manage Scheduler. The answer was not to widen permissions casually. It was a scoped policy for `orbit-*` schedules, then a clean redeploy and verification that the schedule was Enabled.

**Raw multi-source data is not a briefing.** Scanning 116 repositories is useful. Dumping all of them into Stale Alerts is not. Pre-filtering into a ranked shortlist made the agent sharper and the email usable. Soft-fail optional sources (Calendar/Gmail/GitHub endpoints) kept the morning run alive when one signal was empty or temporarily unavailable.

I also learned that proof for an always-on agent has to be public-safe. The strongest shareable evidence is the 6 AM email itself, backed by a verified CloudWatch scheduled trigger. Console screenshots help, but they are easy to overshare with account identifiers. For this submission I rely on the delivered briefing and the live public demo.

---

## Link to App or Repo

- **Live app (public showcase + demo):** [Orbit on S3 website hosting](http://orbit-ai-webbucket-usf0sxolvb5r.s3-website-us-east-1.amazonaws.com)
- **Public repository:** [github.com/joelanarba/orbit-ai](https://github.com/joelanarba/orbit-ai)

Orbit runs every morning whether I remember to open a laptop or not. That was the point of the challenge, and that is what shipped.
