import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { api } from "../api.js";
import { demoReport, demoReports } from "../demoData.js";
import { parseBriefingSections, attentionCount } from "../lib/briefingSections.js";
import { FocusText } from "../lib/focusText.jsx";
import WakeTrace from "../components/WakeTrace.jsx";

function attentionLine(count) {
  if (count === 1) return "One thing needs your attention today.";
  if (count === 2) return "Two things need your attention today.";
  if (count >= 3) return "Three things need your attention today.";
  return "Nothing urgent right now.";
}

function formatBriefingDate(date) {
  if (!date) return null;
  const parsed = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Accra",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(parsed);
}

function ReportSkeleton() {
  return (
    <div className="report-skeleton" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading briefing</span>
      <div className="skeleton skeleton-title" aria-hidden="true" />
      <div className="skeleton skeleton-lede" aria-hidden="true" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton skeleton-row" aria-hidden="true" />
      ))}
    </div>
  );
}

function SourceEvidence({ signals }) {
  if (!signals) return null;
  return (
    <div className="source-evidence">
      <h3>What Orbit read</h3>
      <div className="source-row">
        <span>Tasks in play</span>
        <span className="value mono">{signals.taskCount}</span>
      </div>
      <div className="source-row">
        <span>Repos scanned</span>
        <span className="value mono">{signals.repoCount}</span>
      </div>
      {signals.staleRepos?.length > 0 && (
        <ul className="source-detail">
          {signals.staleRepos.slice(0, 3).map((r) => (
            <li key={r.repo}>
              <span>{r.repo.split("/")[1] ?? r.repo}</span>
              <span className="mono">{r.daysStale}d quiet</span>
            </li>
          ))}
        </ul>
      )}
      {signals.failingCi?.length > 0 && (
        <ul className="source-detail">
          {signals.failingCi.slice(0, 3).map((repo) => (
            <li key={repo}>
              <span>{repo.split("/")[1] ?? repo}</span>
              <span className="alert-text">CI failing</span>
            </li>
          ))}
        </ul>
      )}
      {signals.calendarEvents?.length > 0 && (
        <>
          <div className="source-row source-row-spaced">
            <span>Calendar</span>
            <span className="value mono">{signals.calendarEvents.length} events</span>
          </div>
          <ul className="source-detail">
            {signals.calendarEvents.slice(0, 2).map((e) => (
              <li key={`${e.title}-${e.start}`}>
                <span>{e.title}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {signals.emailHighlights?.length > 0 && (
        <>
          <div className="source-row source-row-spaced">
            <span>Inbox</span>
            <span className="value mono">{signals.emailHighlights.length} flagged</span>
          </div>
          <ul className="source-detail">
            {signals.emailHighlights.slice(0, 2).map((e) => (
              <li key={e.threadId ?? e.subject}>
                <span>{e.subject}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function SupportBlock({ title, items, className = "" }) {
  if (!items?.length) return null;
  return (
    <section className={`support-block ${className}`.trim()}>
      <h3>{title}</h3>
      <ul className="support-list">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export default function Briefing({ demo = false, status = null, running = false, isDemo = false }) {
  const [reports, setReports] = useState(() => (demo ? demoReports : null));
  const [selected, setSelected] = useState(() => (demo ? demoReport.date : null));
  const [report, setReport] = useState(() => (demo ? demoReport : null));
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (demo) return;
    api
      .reports()
      .then(({ reports: list }) => {
        setReports(list);
        if (list.length > 0) setSelected(list[0].date);
      })
      .catch((err) => setError(err.message));
  }, [demo]);

  useEffect(() => {
    if (demo) {
      setReport(demoReport);
      return;
    }
    if (!selected) return;
    setLoadingReport(true);
    api
      .report(selected)
      .then(setReport)
      .catch((err) => setError(err.message))
      .finally(() => setLoadingReport(false));
  }, [demo, selected]);

  if (error) {
    return (
      <div className="error-note" role="alert">
        <span>The briefing could not be loaded: {error}</span>
        <button className="btn btn-ghost" type="button" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  if (reports && reports.length === 0) {
    return (
      <>
        <header className="page-header">
          <h1 className="display">{isDemo ? "Good morning." : "Good morning, Joel."}</h1>
        </header>
        <WakeTrace status={status} report={null} signals={null} running={running} />
        <div className="empty">
          <strong>No briefings yet.</strong>
          {demo
            ? "Nothing urgent — Orbit will check again at 6 AM."
            : "Run Orbit once and the first briefing will land here in about a minute."}
        </div>
      </>
    );
  }

  const parsed = report ? parseBriefingSections(report.markdown) : null;
  const count = parsed?.valid ? attentionCount(parsed) : null;
  const useStructured = parsed?.valid && !loadingReport;
  const briefingDate = formatBriefingDate(report?.date ?? selected);

  return (
    <div className={useStructured ? "briefing-reveal" : undefined}>
      <header className="page-header page-header--briefing">
        <div className="page-header-top">
          <h1 className="display">{isDemo ? "Good morning." : "Good morning, Joel."}</h1>
          {briefingDate && <span className="date mono">{briefingDate}</span>}
        </div>
        {useStructured && (
          <>
            <p className="lede">{attentionLine(count)}</p>
            {parsed.focus && <FocusText text={parsed.focus} className="focus-line display" />}
          </>
        )}
      </header>

      <div className="briefing-stage">
        <WakeTrace
          status={status}
          report={report}
          signals={report?.signals}
          running={running}
        />

        {loadingReport ? (
          <ReportSkeleton />
        ) : useStructured ? (
          <>
            <ol className="priority-list" aria-label="Top priorities">
              {parsed.top3.map((item, i) => (
                <li className="priority-item" key={i}>
                  <span className="priority-rank mono" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h2 className="priority-title">{item.title}</h2>
                    {item.rationale && <p className="priority-rationale">{item.rationale}</p>}
                  </div>
                </li>
              ))}
            </ol>

            <div className="support-grid">
              <SupportBlock
                title="Deadline radar"
                items={parsed.deadlineRadar}
                className="support-block--primary"
              />
              <SourceEvidence signals={report?.signals} />
              <SupportBlock title="Stale work" items={parsed.staleAlerts} />
              <SupportBlock
                title="Quick wins"
                items={parsed.quickWins}
                className="support-block--accent"
              />
            </div>
          </>
        ) : (
          report && (
            <article className="md">
              <ReactMarkdown components={{ h1: () => null }}>{report.markdown}</ReactMarkdown>
            </article>
          )
        )}
      </div>

      {reports && reports.length > 0 && (
        <section className="report-history">
          <h3>Past briefings</h3>
          <div className="history-scroll">
            {reports.slice(0, 14).map((r) => (
              <button
                key={r.date}
                type="button"
                className="history-chip"
                aria-current={r.date === selected ? "true" : undefined}
                onClick={() => setSelected(r.date)}
              >
                <span className="mono">{r.date}</span>
                <span className="mono history-size">{(r.size / 1024).toFixed(1)} KB</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
