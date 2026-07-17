import { parseBriefingSections, attentionCount } from "../lib/briefingSections.js";
import { FocusText } from "../lib/focusText.jsx";
import { demoReport, demoStatus } from "../demoData.js";
import WakeTrace from "../components/WakeTrace.jsx";

const SERVICES = [
  "EventBridge Scheduler",
  "Lambda",
  "DynamoDB",
  "OpenAI",
  "SES",
  "S3",
  "CloudWatch",
];

function attentionLine(count) {
  if (count === 1) return "One thing needs your attention today.";
  if (count === 2) return "Two things need your attention today.";
  if (count >= 3) return "Three things need your attention today.";
  return "Nothing urgent right now.";
}

function OrbitMark({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="3.4" fill="currentColor" />
      <ellipse
        cx="10"
        cy="10"
        rx="8.6"
        ry="4.4"
        stroke="currentColor"
        strokeWidth="1.3"
        transform="rotate(-24 10 10)"
        opacity="0.55"
      />
    </svg>
  );
}

function BriefingPreview() {
  const parsed = parseBriefingSections(demoReport.markdown);
  const count = attentionCount(parsed);

  return (
    <div className="product-window" aria-label="Sample Orbit briefing">
      <div className="product-window-chrome">
        <span className="product-window-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="product-window-title mono">orbit · morning briefing</span>
      </div>
      <div className="product-window-body">
        <p className="product-greeting display">Good morning.</p>
        <p className="product-lede">{attentionLine(count)}</p>
        {parsed.focus && <FocusText text={parsed.focus} className="product-focus display" />}
        <WakeTrace status={demoStatus} report={demoReport} signals={demoReport.signals} />
        <ol className="product-priorities" aria-label="Top priorities">
          {parsed.top3.slice(0, 3).map((item, i) => (
            <li key={item.title}>
              <span className="mono" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <strong>{item.title}</strong>
                {item.rationale && <p>{item.rationale}</p>}
              </div>
            </li>
          ))}
        </ol>
        <div className="product-signals">
          <div>
            <span className="label">Tasks</span>
            <span className="mono">{demoReport.signals.taskCount}</span>
          </div>
          <div>
            <span className="label">Repos</span>
            <span className="mono">{demoReport.signals.repoCount}</span>
          </div>
          <div>
            <span className="label">Inbox</span>
            <span className="mono">{demoReport.signals.emailHighlights.length}</span>
          </div>
          <div>
            <span className="label">Calendar</span>
            <span className="mono">{demoReport.signals.calendarEvents.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Showcase({ onOpenDemo, onPrivateAccess }) {
  return (
    <div className="showcase">
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <header className="showcase-nav">
        <div className="showcase-nav-inner">
          <div className="brand">
            <OrbitMark /> Orbit
          </div>
          <nav aria-label="Showcase">
            <a href="#how">How it works</a>
            <a href="#sources">Sources</a>
            <a href="#proof">Proof</a>
          </nav>
          <div className="showcase-nav-actions">
            <button type="button" className="btn btn-ghost" onClick={onPrivateAccess}>
              Private access
            </button>
            <button type="button" className="btn btn-primary" onClick={onOpenDemo}>
              View demo
            </button>
          </div>
        </div>
      </header>

      <main id="main">
        <section className="showcase-hero">
          <div className="showcase-hero-copy">
            <p className="eyebrow">Always-on personal agent</p>
            <h1 className="display">Your day, already ranked.</h1>
            <p className="hero-lede">
              Orbit wakes before you, reads tasks, GitHub, calendar, and inbox signals, then
              returns a focused morning briefing — without being asked.
            </p>
            <div className="hero-actions">
              <button type="button" className="btn btn-primary" onClick={onOpenDemo}>
                View today&apos;s briefing
              </button>
              <a className="text-link" href="#how">
                See how it works
              </a>
            </div>
          </div>
          <div className="showcase-hero-preview">
            <div className="orbit-path" aria-hidden="true" />
            <BriefingPreview />
          </div>
        </section>

        <section className="trust-strip" aria-label="Services in the loop">
          <p className="trust-label">Built on a real AWS loop</p>
          <ul>
            {SERVICES.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </section>

        <section id="how" className="narrative narrative--wake">
          <div className="narrative-copy">
            <p className="eyebrow">Schedule</p>
            <h2 className="display">Wakes without being asked</h2>
            <p>
              EventBridge fires at 6:00 Accra time. Lambda gathers context, OpenAI ranks what
              matters, SES delivers the briefing, and S3 keeps the receipt. The wake trace shows
              whether the run was scheduled or manual.
            </p>
          </div>
          <div className="narrative-panel">
            <WakeTrace status={demoStatus} report={demoReport} signals={demoReport.signals} />
          </div>
        </section>

        <section id="sources" className="narrative narrative--sources">
          <div className="narrative-panel narrative-panel--wide">
            <h3>What Orbit read this morning</h3>
            <div className="source-cards">
              <article>
                <span className="label">Tasks</span>
                <strong className="mono">{demoReport.signals.taskCount}</strong>
                <p>Active commitments from DynamoDB, weighed by deadline and importance.</p>
              </article>
              <article>
                <span className="label">GitHub</span>
                <strong className="mono">{demoReport.signals.repoCount}</strong>
                <p>
                  Stale repos and failing CI flagged — including{" "}
                  {demoReport.signals.failingCi[0]?.split("/")[1] ?? "CI"}.
                </p>
              </article>
              <article>
                <span className="label">Calendar</span>
                <strong className="mono">{demoReport.signals.calendarEvents.length}</strong>
                <p>{demoReport.signals.calendarEvents[0]?.title ?? "Upcoming events"}.</p>
              </article>
              <article>
                <span className="label">Gmail</span>
                <strong className="mono">{demoReport.signals.emailHighlights.length}</strong>
                <p>{demoReport.signals.emailHighlights[0]?.subject ?? "Inbox highlights"}.</p>
              </article>
            </div>
          </div>
          <div className="narrative-copy">
            <p className="eyebrow">Sources</p>
            <h2 className="display">Reads the work around you</h2>
            <p>
              Tasks, repos, meetings, and messages land in one context payload. Orbit reasons over
              them once, then returns a ranked top three instead of another inbox to check.
            </p>
          </div>
        </section>

        <section id="proof" className="narrative narrative--proof">
          <div className="narrative-copy">
            <p className="eyebrow">Evidence</p>
            <h2 className="display">Leaves proof</h2>
            <p>
              Every run archives a markdown report and context JSON. Judges can see the scheduled
              trigger in CloudWatch, the email in SES, and the briefing stored in S3.
            </p>
          </div>
          <div className="narrative-panel proof-cards">
            <div>
              <span className="label">Email</span>
              <p>SES delivers your briefing each morning.</p>
            </div>
            <div>
              <span className="label">Archive</span>
              <p className="mono">reports/{demoReport.date}.md</p>
            </div>
            <div>
              <span className="label">Logs</span>
              <p>CloudWatch keeps the unattended execution history.</p>
            </div>
          </div>
        </section>

        <section className="showcase-cta">
          <h2 className="display">Open the synthetic demo</h2>
          <p>
            Explore a read-only morning briefing built from sample tasks and signals. Live actions
            stay locked until you enter a private access token.
          </p>
          <div className="hero-actions">
            <button type="button" className="btn btn-primary" onClick={onOpenDemo}>
              View today&apos;s briefing
            </button>
            <button type="button" className="btn btn-ghost" onClick={onPrivateAccess}>
              Private access
            </button>
          </div>
        </section>
      </main>

      <footer className="showcase-footer">
        <div className="brand">
          <OrbitMark size={18} /> Orbit
        </div>
        <p>
          Orbit runs unattended every morning at 6:00 Accra time — DynamoDB tasks, GitHub signals,
          Calendar and Gmail context, GPT reasoning, SES delivery, S3 archive.
        </p>
      </footer>
    </div>
  );
}
