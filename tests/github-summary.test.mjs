import test from "node:test";
import assert from "node:assert/strict";
import {
  repoAttentionScore,
  summarizeGithubActivity,
} from "../src/sources/github.mjs";

function repo(overrides) {
  return {
    repo: "acme/thing",
    daysStale: 3,
    isStale: false,
    openIssueCount: 0,
    openPullRequestCount: 0,
    openPullRequests: [],
    failingCi: false,
    recentCommits: [{ date: "2026-07-16T00:00:00Z", message: "wip" }],
    recentWorkflowRuns: [],
    ...overrides,
  };
}

test("repoAttentionScore ignores healthy and long-dormant repos", () => {
  assert.equal(repoAttentionScore(repo()), 0);
  // Dormant: stale but pushed long ago — not actionable.
  assert.equal(repoAttentionScore(repo({ isStale: true, daysStale: 400 })), 0);
  assert.equal(repoAttentionScore({ repo: "x", error: "boom" }), 0);
});

test("repoAttentionScore ranks failing CI and open PRs above recently dropped", () => {
  const failing = repoAttentionScore(repo({ failingCi: true }));
  const withPr = repoAttentionScore(repo({ openPullRequestCount: 2 }));
  const dropped = repoAttentionScore(repo({ isStale: true, daysStale: 20 }));
  assert.ok(failing > withPr);
  assert.ok(withPr > dropped);
  assert.ok(dropped > 0);
});

test("summarizeGithubActivity keeps counts and a bounded ranked shortlist", () => {
  const activity = [];
  // 40 dormant repos that should never reach the shortlist.
  for (let i = 0; i < 40; i++) {
    activity.push(repo({ repo: `acme/dormant-${i}`, isStale: true, daysStale: 300 + i }));
  }
  // A handful of genuinely actionable repos.
  activity.push(repo({ repo: "acme/ci", failingCi: true, isStale: true, daysStale: 18 }));
  activity.push(repo({ repo: "acme/pr", openPullRequestCount: 3, openPullRequests: [{ number: 1, title: "Fix" }] }));
  activity.push(repo({ repo: "acme/dropped", isStale: true, daysStale: 25 }));
  activity.push({ repo: "acme/broken", error: "GitHub 500" });

  const summary = summarizeGithubActivity(activity);
  assert.equal(summary.scanned, activity.length);
  assert.equal(summary.staleCount, 42); // 40 dormant + ci + dropped (pr repo is not stale)
  assert.equal(summary.failingCount, 1);
  assert.ok(summary.repos.length <= 8);
  assert.equal(summary.repos[0].repo, "acme/ci"); // failing CI ranks first
  assert.ok(summary.repos.every((r) => !("recentWorkflowRuns" in r)));
  assert.ok(summary.repos.every((r) => !r.repo.startsWith("acme/dormant")));
});
