import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { api } from "../api.js";

function prettyDate(iso) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${iso}T12:00:00Z`));
}

function ReportSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="skeleton" style={{ height: 22, width: "45%", marginBottom: 22 }} />
      {[92, 70, 84, 60, 76].map((w, i) => (
        <div key={i} className="skeleton" style={{ height: 13, width: `${w}%`, marginBottom: 12 }} />
      ))}
    </div>
  );
}

function Signals({ signals }) {
  if (!signals) return null;
  return (
    <section>
      <h3>Repo signals</h3>
      <div className="signal-rows">
        <div className="signal-row">
          <span>Repos scanned</span>
          <span className="value mono">{signals.repoCount}</span>
        </div>
        <div className="signal-row">
          <span>Active tasks in play</span>
          <span className="value mono">{signals.taskCount}</span>
        </div>
        <div className="signal-row">
          <span>Going stale</span>
          <span className="value mono">{signals.staleRepos.length}</span>
        </div>
        <div className="signal-row">
          <span>Failing CI</span>
          <span className="value mono">{signals.failingCi.length}</span>
        </div>
      </div>
      {signals.staleRepos.length > 0 && (
        <ul className="signal-list">
          {signals.staleRepos.slice(0, 5).map((r) => (
            <li key={r.repo}>
              <span>{r.repo.split("/")[1] ?? r.repo}</span>
              {r.daysStale != null && <span className="mono">{r.daysStale}d quiet</span>}
            </li>
          ))}
        </ul>
      )}
      {signals.failingCi.length > 0 && (
        <ul className="signal-list">
          {signals.failingCi.slice(0, 5).map((repo) => (
            <li key={repo}>
              <span>{repo.split("/")[1] ?? repo}</span>
              <span style={{ color: "var(--danger)" }}>CI red</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function Briefing() {
  const [reports, setReports] = useState(null);
  const [selected, setSelected] = useState(null);
  const [report, setReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .reports()
      .then(({ reports }) => {
        setReports(reports);
        if (reports.length > 0) setSelected(reports[0].date);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoadingReport(true);
    api
      .report(selected)
      .then(setReport)
      .catch((err) => setError(err.message))
      .finally(() => setLoadingReport(false));
  }, [selected]);

  if (error) {
    return (
      <div className="error-note" role="alert">
        <span>The briefing could not be loaded: {error}</span>
        <button className="btn btn-ghost" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  if (reports && reports.length === 0) {
    return (
      <div className="empty">
        <strong>No briefings yet.</strong>
        Hit "Run now" and Orbit will read your tasks and repos, think, and file the
        first report here in about a minute.
      </div>
    );
  }

  return (
    <div className="briefing-grid">
      <article className="report">
        {report && !loadingReport ? (
          <>
            <div className="report-head">
              <h2>{prettyDate(report.date)}</h2>
              {report.generatedAt && (
                <span className="stamp mono">
                  filed {new Date(report.generatedAt).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
            <div className="md">
              {/* The H1 "# Orbit Briefing" is chrome, not content; drop it. */}
              <ReactMarkdown components={{ h1: () => null }}>{report.markdown}</ReactMarkdown>
            </div>
          </>
        ) : (
          <ReportSkeleton />
        )}
      </article>

      <aside className="rail">
        <Signals signals={report?.signals} />
        <section>
          <h3>Past briefings</h3>
          <div className="history">
            {(reports ?? []).slice(0, 14).map((r) => (
              <button
                key={r.date}
                aria-current={r.date === selected}
                onClick={() => setSelected(r.date)}
              >
                <span className="mono">{r.date}</span>
                <span className="size mono">{(r.size / 1024).toFixed(1)} KB</span>
              </button>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}
