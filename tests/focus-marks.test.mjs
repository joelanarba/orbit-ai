import test from "node:test";
import assert from "node:assert/strict";
import { splitFocusMarks } from "../web/src/lib/focusMarks.js";

test("splitFocusMarks keeps plain text and bold spans without HTML", () => {
  assert.deepEqual(splitFocusMarks(""), []);
  assert.deepEqual(splitFocusMarks("No markers here."), [
    { type: "text", value: "No markers here." },
  ]);
  assert.deepEqual(
    splitFocusMarks("Protect 90 minutes for the **Atlas onboarding walkthrough** today."),
    [
      { type: "text", value: "Protect 90 minutes for the " },
      { type: "strong", value: "Atlas onboarding walkthrough" },
      { type: "text", value: " today." },
    ]
  );
});
