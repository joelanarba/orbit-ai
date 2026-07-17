# Lessons

Patterns learned from corrections. Review at the start of each session.

- (Carried over from BuilderOS) Bedrock token quotas can wall you mid-project — keep the reasoning provider behind a single function (`getPriorityBriefing`) so it's swappable.
- Prefer authenticated auto-discovery (`GET /user/repos?type=owner`) over a manual `GITHUB_REPOS` list when the user has no org and just wants all personal repos watched. Keep an explicit list only as an optional override.
- When enriching GitHub for briefings, prefer cheap list-payload fields (`pushed_at`) plus capped recent endpoints (commits/issues/PRs/Actions `per_page≤5`) and soft-fail optional endpoints — never full trees or unbounded history. Cap repo parallelism for Lambda timeouts.
- A `.env` open in the editor can look populated while the file on disk is still empty (unsaved buffer). Before declaring credentials "missing", check the file size on disk — and before running anything that reads `.env`, confirm it's saved.
- Admin-ish IAM users may still lack `ssm:PutParameter`/`ses:*` — verify with a cheap read call (`aws ssm describe-parameters --max-items 1`) before a long setup chain, so the failure surfaces at step 1 rather than mid-pipeline.
- When Google Desktop OAuth keys are "in `.env`" but missing on disk, look for today's `client_secret_*.apps.googleusercontent.com.json` in Downloads (`installed` shape) and append `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` to gitignored `.env` without printing values — do not commit the JSON or `.env`.
- `scripts/google-oauth-setup.mjs` uses `server.setTimeout(5m)`, which is an idle-socket timeout, not a wall-clock consent deadline — if Joel does not finish the browser flow, kill the Node process and re-run `npm run setup:google` rather than leaving a hung loopback listener.
- Phase 2 success means gather shows `calendar=N` / `gmail=N` (numeric), not `off` — an empty calendar (`N=0`) still proves OAuth + Calendar API worked; only `null`/`off` means soft-fail or missing credentials. Verify with SSM metadata (`describe-parameters` / Name+Type+Version) and S3 context array lengths — never decrypt tokens or print event/email content.
