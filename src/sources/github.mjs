// GitHub source: discover owned repos (or use an explicit override list), then
// per repo: commits, open issues/PRs, recent Actions runs, push date, stale flag.
// Uses plain fetch against the GitHub REST API — no SDK needed.

const STALE_AFTER_DAYS = 14;
const API = "https://api.github.com";
const REPO_CONCURRENCY = 5;
const RECENT_COMMITS = 5;
const RECENT_PRS = 5;
const RECENT_RUNS = 5;

async function gh(path, token) {
  const res = await fetch(`${API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "orbit-ai",
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub ${res.status} on ${path}: ${await res.text()}`);
  }
  return res.json();
}

/** Soft-fail wrapper so one endpoint cannot wipe an otherwise useful repo snapshot. */
async function ghOptional(path, token) {
  try {
    return await gh(path, token);
  } catch (err) {
    console.error(`GitHub optional fetch failed ${path}:`, err.message ?? err);
    return null;
  }
}

/**
 * Authenticated discovery: all repos the PAT owner owns (not forks/archived).
 * Paginate GET /user/repos?type=owner. Keeps cheap fields from the list payload.
 */
async function listOwnedRepos(token) {
  const repos = [];
  let page = 1;
  for (;;) {
    const batch = await gh(
      `/user/repos?type=owner&per_page=100&page=${page}&sort=updated`,
      token
    );
    if (!batch.length) break;
    for (const r of batch) {
      if (r.archived || r.fork) continue;
      repos.push({
        fullName: r.full_name,
        lastPushDate: r.pushed_at ?? null,
        defaultBranch: r.default_branch ?? null,
      });
    }
    if (batch.length < 100) break;
    page += 1;
  }
  return repos;
}

function normalizeRepoList(repos) {
  return (repos ?? []).map((r) =>
    typeof r === "string"
      ? { fullName: r, lastPushDate: null, defaultBranch: null }
      : r
  );
}

async function repoActivity(meta, token, now) {
  const { fullName, lastPushDate, defaultBranch } = meta;

  const [commits, issues, pulls, runsPayload] = await Promise.all([
    gh(`/repos/${fullName}/commits?per_page=${RECENT_COMMITS}`, token),
    gh(`/repos/${fullName}/issues?state=open&per_page=100`, token),
    ghOptional(
      `/repos/${fullName}/pulls?state=open&per_page=${RECENT_PRS}&sort=updated&direction=desc`,
      token
    ),
    ghOptional(
      `/repos/${fullName}/actions/runs?per_page=${RECENT_RUNS}`,
      token
    ),
  ]);

  const lastCommitDate = commits[0]?.commit?.committer?.date ?? null;
  // Prefer commit date for stale; fall back to last push from the repo list object.
  const activityDate = lastCommitDate ?? lastPushDate;
  const daysStale = activityDate
    ? Math.floor((now - new Date(activityDate)) / 86_400_000)
    : null;

  const openIssues = issues.filter((i) => !i.pull_request);
  const openPulls = Array.isArray(pulls)
    ? pulls
    : issues.filter((i) => i.pull_request);

  const workflowRuns = Array.isArray(runsPayload?.workflow_runs)
    ? runsPayload.workflow_runs
    : [];

  const recentWorkflowRuns = workflowRuns.map((run) => ({
    name: run.name ?? run.display_title ?? null,
    conclusion: run.conclusion ?? null,
    status: run.status ?? null,
    event: run.event ?? null,
    updatedAt: run.updated_at ?? null,
    htmlUrl: run.html_url ?? null,
  }));

  const failingCi = recentWorkflowRuns.some(
    (r) => r.conclusion === "failure" || r.conclusion === "cancelled"
  );

  return {
    repo: fullName,
    defaultBranch,
    lastCommitDate,
    lastPushDate,
    daysStale,
    isStale: daysStale === null || daysStale > STALE_AFTER_DAYS,
    openIssueCount: openIssues.length,
    openPullRequestCount: openPulls.length,
    openPullRequests: openPulls.slice(0, RECENT_PRS).map((p) => ({
      number: p.number,
      title: p.title,
      updatedAt: p.updated_at ?? null,
    })),
    recentCommits: commits.map((c) => ({
      date: c.commit?.committer?.date,
      message: (c.commit?.message ?? "").split("\n")[0],
    })),
    recentWorkflowRuns,
    failingCi,
  };
}

/** Run async work over items with a fixed concurrency cap (Lambda-friendly). */
async function mapSettled(items, concurrency, fn) {
  const results = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { status: "fulfilled", value: await fn(items[i], i) };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

/**
 * @returns per-repo activity, or null when the source is not configured
 *          (missing token) so the prompt can ignore it.
 *          If `repos` is non-empty, that list is used as an override;
 *          otherwise owned repos are discovered via the PAT.
 */
export async function getGithubActivity({ token, repos }) {
  if (!token) return null;

  const watched =
    repos?.length > 0
      ? normalizeRepoList(repos)
      : await listOwnedRepos(token);
  if (!watched.length) return null;

  const now = Date.now();
  const settled = await mapSettled(watched, REPO_CONCURRENCY, (meta) =>
    repoActivity(meta, token, now)
  );

  const activity = [];
  for (const [i, result] of settled.entries()) {
    if (result.status === "fulfilled") {
      activity.push(result.value);
    } else {
      console.error(
        `GitHub check failed for ${watched[i].fullName}:`,
        result.reason
      );
      activity.push({
        repo: watched[i].fullName,
        error: String(result.reason?.message ?? result.reason),
      });
    }
  }
  return activity;
}
