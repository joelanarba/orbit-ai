// GitHub source: per watched repo, last commit date, recent commit subjects,
// open issue count, and a stale flag when nothing was committed for >14 days.
// Uses plain fetch against the GitHub REST API — no SDK needed.

const STALE_AFTER_DAYS = 14;
const API = "https://api.github.com";

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

async function repoActivity(fullName, token, now) {
  const [commits, issues] = await Promise.all([
    gh(`/repos/${fullName}/commits?per_page=5`, token),
    gh(`/repos/${fullName}/issues?state=open&per_page=100`, token),
  ]);

  const lastCommitDate = commits[0]?.commit?.committer?.date ?? null;
  const daysStale = lastCommitDate
    ? Math.floor((now - new Date(lastCommitDate)) / 86_400_000)
    : null;

  return {
    repo: fullName,
    lastCommitDate,
    daysStale,
    isStale: daysStale === null || daysStale > STALE_AFTER_DAYS,
    // The issues endpoint returns PRs too; keep only real issues.
    openIssueCount: issues.filter((i) => !i.pull_request).length,
    recentCommits: commits.map((c) => ({
      date: c.commit?.committer?.date,
      message: (c.commit?.message ?? "").split("\n")[0],
    })),
  };
}

/**
 * @returns per-repo activity, or null when the source is not configured
 *          (missing token or empty repo list) so the prompt can ignore it.
 */
export async function getGithubActivity({ token, repos }) {
  if (!token || !repos?.length) return null;
  const now = Date.now();

  const settled = await Promise.allSettled(
    repos.map((r) => repoActivity(r, token, now))
  );
  const activity = [];
  for (const [i, result] of settled.entries()) {
    if (result.status === "fulfilled") {
      activity.push(result.value);
    } else {
      console.error(`GitHub check failed for ${repos[i]}:`, result.reason);
      activity.push({ repo: repos[i], error: String(result.reason?.message ?? result.reason) });
    }
  }
  return activity;
}
