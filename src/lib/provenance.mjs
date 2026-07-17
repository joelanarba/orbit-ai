// Resolve how a briefing run was triggered from the Lambda event payload.
const VALID_TRIGGERS = new Set(["scheduled", "manual", "unknown"]);

export function resolveTrigger(event = {}) {
  const e = event ?? {};
  const raw = e.trigger ?? e.detail?.trigger ?? null;
  if (raw === "scheduled" || raw === "manual") return raw;
  if (e.source === "dashboard") return "manual";
  return "unknown";
}

export function isValidTrigger(value) {
  return VALID_TRIGGERS.has(value);
}
