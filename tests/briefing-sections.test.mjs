import test from "node:test";
import assert from "node:assert/strict";
import {
  parseBriefingSections,
  parseTop3Items,
  attentionCount,
} from "../web/src/lib/briefingSections.js";
import { demoReport } from "../web/src/demoData.js";

test("parseBriefingSections extracts all five sections from demo markdown", () => {
  const parsed = parseBriefingSections(demoReport.markdown);
  assert.equal(parsed.valid, true);
  assert.ok(parsed.focus.includes("Atlas onboarding walkthrough"));
  assert.equal(parsed.top3.length, 3);
  assert.equal(parsed.top3[0].title, "Publish the Atlas onboarding walkthrough");
  assert.ok(parsed.deadlineRadar.length >= 2);
  assert.ok(parsed.staleAlerts.length >= 2);
  assert.ok(parsed.quickWins.length >= 2);
  assert.equal(attentionCount(parsed), 3);
});

test("parseTop3Items handles bold titles with dash rationale", () => {
  const items = parseTop3Items(
    "1. **Ship the doc** - due today, high impact.\n2. **Reply to venue** - waiting on confirmation."
  );
  assert.equal(items.length, 2);
  assert.equal(items[0].title, "Ship the doc");
  assert.match(items[0].rationale, /due today/);
});

test("parseBriefingSections returns invalid for malformed markdown", () => {
  const parsed = parseBriefingSections("# Just a title\n\nNo sections here.");
  assert.equal(parsed.valid, false);
  assert.deepEqual(parsed.top3, []);
});
