import test from "node:test";
import assert from "node:assert/strict";
import { resolveTrigger, isValidTrigger } from "../src/lib/provenance.mjs";

test("resolveTrigger maps scheduler, dashboard, and unknown invocations", () => {
  assert.equal(resolveTrigger({ trigger: "scheduled" }), "scheduled");
  assert.equal(resolveTrigger({ source: "dashboard", trigger: "manual" }), "manual");
  assert.equal(resolveTrigger({ source: "dashboard" }), "manual");
  assert.equal(resolveTrigger({}), "unknown");
  assert.equal(resolveTrigger(null), "unknown");
});

test("isValidTrigger accepts only known trigger values", () => {
  assert.ok(isValidTrigger("scheduled"));
  assert.ok(isValidTrigger("manual"));
  assert.ok(isValidTrigger("unknown"));
  assert.ok(!isValidTrigger("cron"));
});
