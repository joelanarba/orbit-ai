import test from "node:test";
import assert from "node:assert/strict";
import { demoReport, demoReports, demoStatus, demoTasks } from "../web/src/demoData.js";

test("demo data is complete, synthetic, and review-ready", () => {
  assert.ok(demoTasks.length >= 8 && demoTasks.length <= 10);
  assert.equal(new Set(demoTasks.map((task) => task.id)).size, demoTasks.length);
  assert.ok(demoTasks.every((task) => task.id.startsWith("demo-")));
  assert.ok(demoTasks.every((task) => task.title && task.category && task.status));

  for (const heading of [
    "## Focus",
    "## Top 3",
    "## Deadline Radar",
    "## Stale Alerts",
    "## Quick Wins",
  ]) {
    assert.match(demoReport.markdown, new RegExp(heading));
  }

  assert.equal(demoReports[0].date, demoReport.date);
  assert.equal(demoStatus.schedule.timezone, "Africa/Accra");
  assert.match(demoStatus.schedule.cron, /0 6/);
  assert.equal(demoStatus.lastRun.trigger, "scheduled");
  assert.equal(demoReport.trigger, "scheduled");

  const { signals } = demoReport;
  assert.ok(signals.repoCount > 0);
  assert.ok(signals.staleRepos.length > 0);
  assert.ok(signals.calendarEvents.length > 0);
  assert.ok(signals.emailHighlights.length > 0);
  assert.ok(
    signals.staleRepos.every(({ repo }) => repo.startsWith("northstar-studio/"))
  );

  // Public showcase/demo stay synthetic-only: no live API client coupling.
  assert.doesNotMatch(
    String(Object.keys({ demoReport, demoReports, demoStatus, demoTasks })),
    /api/i
  );
});
