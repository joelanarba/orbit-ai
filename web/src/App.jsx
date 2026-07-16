import { useCallback, useEffect, useRef, useState } from "react";
import { Moon, PaperPlaneTilt } from "@phosphor-icons/react";
import { api, getToken, setToken, clearToken, ApiError } from "./api.js";
import Briefing from "./views/Briefing.jsx";
import Tasks from "./views/Tasks.jsx";

const ACCRA = "Africa/Accra";

function OrbitMark({ size = 20 }) {
  // Simple geometric mark: a planet with one orbit ring.
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

function accraGreeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: ACCRA, hour: "numeric", hour12: false }).format(new Date())
  );
  if (hour < 12) return "Good morning, Joel.";
  if (hour < 17) return "Good afternoon, Joel.";
  return "Good evening, Joel.";
}

function longToday() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: ACCRA,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

function timeUntil(iso) {
  const ms = new Date(iso) - new Date();
  if (ms <= 0) return "shortly";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.round((ms % 3_600_000) / 60_000);
  return h > 0 ? `in ${h}h ${m}m` : `in ${m}m`;
}

function TokenGate({ onUnlock }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!value.trim()) return;
    setChecking(true);
    setError(null);
    setToken(value.trim());
    try {
      await api.status();
      onUnlock();
    } catch (err) {
      clearToken();
      setError(
        err instanceof ApiError && err.status === 401
          ? "That token was rejected. Check it and try again."
          : "Could not reach the Orbit API. Check your connection."
      );
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="gate">
      <form className="gate-card" onSubmit={submit}>
        <div className="brand">
          <OrbitMark size={22} /> Orbit
        </div>
        <h1>This desk is Joel's.</h1>
        <p>Paste the dashboard token to open it.</p>
        <div className="field">
          <label htmlFor="token">Dashboard token</label>
          <input
            id="token"
            type="password"
            autoFocus
            autoComplete="off"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="From SSM /orbit/dashboard-token"
          />
        </div>
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={checking || !value.trim()}>
          {checking ? "Checking" : "Unlock"}
        </button>
      </form>
    </div>
  );
}

export default function App() {
  const [unlocked, setUnlocked] = useState(() => Boolean(getToken()));
  const [view, setView] = useState("briefing");
  const [status, setStatus] = useState(null);
  const [running, setRunning] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const pollRef = useRef(null);

  const loadStatus = useCallback(async () => {
    try {
      const s = await api.status();
      setStatus(s);
      return s;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearToken();
        setUnlocked(false);
      }
      return null;
    }
  }, []);

  useEffect(() => {
    if (unlocked) loadStatus();
  }, [unlocked, loadStatus]);

  useEffect(() => () => clearInterval(pollRef.current), []);

  async function runNow() {
    const before = status?.lastRun?.completedAt ?? null;
    setRunning(true);
    try {
      await api.runNow();
    } catch {
      setRunning(false);
      return;
    }
    // The briefing takes about a minute; poll until a newer report lands.
    const startedAt = Date.now();
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const s = await loadStatus();
      const after = s?.lastRun?.completedAt ?? null;
      if ((after && after !== before) || Date.now() - startedAt > 180_000) {
        clearInterval(pollRef.current);
        setRunning(false);
        setReloadKey((k) => k + 1);
      }
    }, 8000);
  }

  if (!unlocked) return <TokenGate onUnlock={() => setUnlocked(true)} />;

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <OrbitMark /> Orbit
          </div>
          <nav className="nav" aria-label="Views">
            <button aria-current={view === "briefing"} onClick={() => setView("briefing")}>
              Briefing
            </button>
            <button aria-current={view === "tasks"} onClick={() => setView("tasks")}>
              Tasks
            </button>
          </nav>
          <div className="topbar-right">
            {running ? (
              <span className="running">
                <span className="pulse" aria-hidden="true" />
                Briefing in progress
              </span>
            ) : (
              status?.nextRun && (
                <div className="runline">
                  Next briefing{" "}
                  <span className="mono" title={status.nextRun}>
                    {timeUntil(status.nextRun)}
                  </span>
                  <br />
                  6:00 wake-up, Accra time
                </div>
              )
            )}
            <button className="btn btn-primary" onClick={runNow} disabled={running}>
              <PaperPlaneTilt size={15} weight="bold" />
              Run now
            </button>
          </div>
        </div>
      </header>

      <div className="greeting">
        <h1>{view === "briefing" ? accraGreeting() : "The task ledger."}</h1>
        <span className="date mono">{longToday()}</span>
      </div>

      {view === "briefing" ? (
        <Briefing key={`b${reloadKey}`} status={status} />
      ) : (
        <Tasks key={`t${reloadKey}`} />
      )}

      <footer style={{ marginTop: 64, color: "var(--text-faint)", fontSize: 12.5 }}>
        <Moon size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />
        Orbit runs unattended every morning: tasks from DynamoDB, signals from GitHub,
        reasoning by GPT, delivery by SES.
      </footer>
    </div>
  );
}
