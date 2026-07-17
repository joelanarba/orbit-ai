import { useCallback, useEffect, useRef, useState } from "react";
import { PaperPlaneTilt } from "@phosphor-icons/react";
import { api, getToken, setToken, clearToken, ApiError } from "./api.js";
import { demoStatus } from "./demoData.js";
import { resolveTheme, toggleTheme } from "./lib/theme.js";
import Briefing from "./views/Briefing.jsx";
import Showcase from "./views/Showcase.jsx";
import Tasks from "./views/Tasks.jsx";

const ACCRA = "Africa/Accra";

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

function longToday() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: ACCRA,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

function initialMode() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("demo") === "1") return "demo";
  if (getToken()) return "real";
  return "showcase";
}

function TokenGate({ onUnlock, onDemo, onBack }) {
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
        <h1>This desk is Joel&apos;s.</h1>
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
        <div className="gate-actions">
          <button className="btn btn-primary" type="submit" disabled={checking || !value.trim()}>
            {checking ? "Checking" : "Unlock"}
          </button>
          <button className="btn btn-ghost" type="button" onClick={onDemo}>
            View public demo
          </button>
          <button className="btn btn-ghost" type="button" onClick={onBack}>
            Back to showcase
          </button>
        </div>
      </form>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState(initialMode);
  const [view, setView] = useState("briefing");
  const [theme, setThemeState] = useState(resolveTheme);
  const [status, setStatus] = useState(() => (mode === "demo" ? demoStatus : null));
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const pollRef = useRef(null);

  const loadStatus = useCallback(async () => {
    if (mode === "demo") {
      setStatus(demoStatus);
      return demoStatus;
    }
    try {
      const s = await api.status();
      setStatus(s);
      return s;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearToken();
        setMode("login");
      }
      return null;
    }
  }, [mode]);

  useEffect(() => {
    if (mode === "demo") setStatus(demoStatus);
    if (mode === "real") loadStatus();
  }, [mode, loadStatus]);

  useEffect(() => () => clearInterval(pollRef.current), []);

  function handleThemeToggle() {
    setThemeState(toggleTheme(theme));
  }

  function openDemo() {
    window.history.replaceState({}, "", `${window.location.pathname}?demo=1`);
    setView("briefing");
    setMode("demo");
  }

  function openShowcase() {
    clearToken();
    window.history.replaceState({}, "", window.location.pathname);
    setMode("showcase");
  }

  function openLogin() {
    window.history.replaceState({}, "", window.location.pathname);
    setMode("login");
  }

  async function runNow() {
    if (mode !== "real") return;
    const before = status?.lastRun?.completedAt ?? null;
    setRunning(true);
    setRunError(null);
    try {
      await api.runNow();
    } catch (err) {
      setRunning(false);
      setRunError(err instanceof Error ? err.message : "Run now failed.");
      return;
    }
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

  if (mode === "showcase") {
    return <Showcase onOpenDemo={openDemo} onPrivateAccess={openLogin} />;
  }

  if (mode === "login") {
    return (
      <TokenGate
        onUnlock={() => {
          window.history.replaceState({}, "", window.location.pathname);
          setMode("real");
        }}
        onDemo={openDemo}
        onBack={openShowcase}
      />
    );
  }

  const isDemo = mode === "demo";

  return (
    <div className="shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      {isDemo && (
        <div className="demo-banner" role="status">
          <span>
            <strong>Demo data</strong> Synthetic examples only. Live actions are disabled.
          </span>
          <div className="demo-banner-actions">
            <button className="demo-link" type="button" onClick={openShowcase}>
              Back to showcase
            </button>
            <button className="demo-link" type="button" onClick={openLogin}>
              Enter access token
            </button>
          </div>
        </div>
      )}

      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <OrbitMark /> Orbit
          </div>
          <nav className="nav" aria-label="Views">
            <button type="button" aria-current={view === "briefing"} onClick={() => setView("briefing")}>
              Briefing
            </button>
            <button type="button" aria-current={view === "tasks"} onClick={() => setView("tasks")}>
              Tasks
            </button>
          </nav>
          <div className="topbar-right">
            {running && <span className="running-label">Briefing in progress</span>}
            <button
              type="button"
              className="theme-toggle"
              onClick={handleThemeToggle}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={runNow}
              disabled={running || isDemo}
              title={isDemo ? "Run now is disabled for public demo data" : undefined}
            >
              <PaperPlaneTilt size={16} weight="bold" aria-hidden="true" />
              <span className="btn-label">{isDemo ? "Demo only" : "Run now"}</span>
            </button>
          </div>
        </div>
      </header>

      {runError && (
        <div className="error-note run-error" role="alert">
          <span>Run now failed: {runError}</span>
          <button className="btn btn-ghost" type="button" onClick={() => setRunError(null)}>
            Dismiss
          </button>
        </div>
      )}

      <main id="main">
        {view === "briefing" ? (
          <Briefing
            key={`b${reloadKey}`}
            demo={isDemo}
            isDemo={isDemo}
            status={status}
            running={running}
          />
        ) : (
          <>
            <header className="page-header">
              <h1 className="display">What Orbit is ranking from</h1>
              <span className="date mono">{longToday()}</span>
            </header>
            <Tasks key={`t${reloadKey}`} demo={isDemo} />
          </>
        )}
      </main>

      <footer className="site-footer">
        Orbit runs unattended every morning at 6:00 Accra time — tasks from DynamoDB, signals from
        GitHub, reasoning by GPT, delivery by SES.
      </footer>
    </div>
  );
}
