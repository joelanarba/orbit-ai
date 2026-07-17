const ACCRA = "Africa/Accra";

function formatAccraTime(iso) {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: ACCRA,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatAccraDateTime(iso) {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: ACCRA,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function triggerHeadline(trigger, running) {
  if (running) return "Orbit is working";
  if (trigger === "scheduled") return "Orbit ran on schedule";
  if (trigger === "manual") return "You asked Orbit to run";
  return "Orbit filed a briefing";
}

function sourceSummary(signals) {
  if (!signals) return null;
  const parts = [];
  if (signals.taskCount != null) parts.push(`${signals.taskCount} tasks`);
  if (signals.repoCount != null) parts.push(`${signals.repoCount} repos`);
  const msgCount = signals.emailHighlights?.length;
  if (msgCount > 0) parts.push(`${msgCount} messages`);
  else if (signals.calendarEvents?.length > 0)
    parts.push(`${signals.calendarEvents.length} events`);
  return parts.length ? parts.join(" · ") : null;
}

export default function WakeTrace({ status, report, signals, running = false }) {
  const trigger = report?.trigger ?? status?.lastRun?.trigger ?? "unknown";
  const filedAt = report?.generatedAt ?? status?.lastRun?.completedAt;
  const nextWake = status?.nextRun;
  const summary = sourceSummary(signals);

  const wakeTime = "06:00";
  const filedTime = formatAccraTime(filedAt);
  const nextTime = nextWake ? formatAccraTime(nextWake) : null;

  return (
    <section className="wake-trace" aria-label="Run receipt">
      <p className="wake-headline">{triggerHeadline(trigger, running)}</p>
      <div className={`wake-path${running ? " wake-path--active" : ""}`}>
        <div className="wake-node">
          <span className="wake-label">Wake</span>
          <span className="wake-time mono">{wakeTime}</span>
        </div>
        <div className="wake-segment" aria-hidden="true" />
        <div className="wake-node">
          <span className="wake-label">{running ? "Filing" : "Filed"}</span>
          <span className="wake-time mono">{running ? "…" : filedTime ?? "—"}</span>
        </div>
        <div className="wake-segment" aria-hidden="true" />
        <div className="wake-node">
          <span className="wake-label">{running ? "Running" : "Now"}</span>
          <span className="wake-time mono">{running ? "active" : "idle"}</span>
        </div>
        {!running && nextTime && (
          <>
            <div className="wake-segment" aria-hidden="true" />
            <div className="wake-node">
              <span className="wake-label">Next wake</span>
              <span className="wake-time mono">{nextTime}</span>
            </div>
          </>
        )}
      </div>
      {summary && <p className="wake-summary mono">{summary}</p>}
      {filedAt && !running && (
        <p className="wake-meta">
          Last filed{" "}
          <span className="mono">{formatAccraDateTime(filedAt)}</span>
          {trigger === "scheduled" && " · unattended"}
          {trigger === "manual" && " · manual run"}
        </p>
      )}
    </section>
  );
}
