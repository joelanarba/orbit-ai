import { useEffect, useMemo, useState } from "react";
import { Check, PencilSimple, TrashSimple } from "@phosphor-icons/react";
import { api } from "../api.js";
import { demoTasks } from "../demoData.js";

const GROUPS = [
  { status: "in_progress", label: "In motion" },
  { status: "blocked", label: "Blocked" },
  { status: "todo", label: "Queued" },
  { status: "done", label: "Done" },
];

const CATEGORIES = [
  "kairo-labs",
  "citsa",
  "aws-sbgl",
  "tedxucc",
  "coursework",
  "research",
  "amalitech",
  "general",
];

function todayISO() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Accra" });
}

function DeadlineStamp({ deadline }) {
  if (!deadline) return null;
  const days = Math.round((new Date(deadline) - new Date(`${todayISO()}T00:00:00`)) / 86_400_000);
  const cls = days < 0 ? "overdue" : days <= 3 ? "soon" : "";
  const note = days < 0 ? `${-days}d over` : days === 0 ? "today" : `${days}d left`;
  return (
    <span className={cls} title={deadline}>
      {deadline.slice(5)} · {note}
    </span>
  );
}

function TaskForm({ initial, onSave, onCancel, saving, error }) {
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    deadline: initial?.deadline ?? "",
    importance: initial?.importance ?? 3,
    category: initial?.category ?? "general",
    effort: initial?.effort ?? "normal",
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form
      className="task-form-panel"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          title: form.title.trim(),
          deadline: form.deadline || null,
          importance: Number(form.importance),
          category: form.category,
          effort: form.effort,
        });
      }}
    >
      <h3>{initial ? "Edit task" : "Add a task"}</h3>
      <div className="field">
        <label htmlFor="tf-title">Title</label>
        <input
          id="tf-title"
          value={form.title}
          onChange={set("title")}
          placeholder="Ship the CITSA handover doc"
          required
        />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="tf-deadline">Deadline</label>
          <input id="tf-deadline" type="date" value={form.deadline} onChange={set("deadline")} />
        </div>
        <div className="field">
          <label htmlFor="tf-importance">Importance</label>
          <select id="tf-importance" value={form.importance} onChange={set("importance")}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} {n === 5 ? "(critical)" : n === 1 ? "(someday)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="tf-category">Category</label>
          <select id="tf-category" value={form.category} onChange={set("category")}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="tf-effort">Effort</label>
          <select id="tf-effort" value={form.effort} onChange={set("effort")}>
            <option value="quick">quick</option>
            <option value="normal">normal</option>
            <option value="deep">deep</option>
          </select>
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={saving || !form.title.trim()}>
          {saving ? "Saving" : initial ? "Save changes" : "Add task"}
        </button>
        {onCancel && (
          <button className="btn btn-ghost" type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function TaskRow({ task, onToggle, onEdit, onDelete, readOnly = false }) {
  const done = task.status === "done";
  return (
    <div className={`task-row${done ? " done" : ""}`}>
      <button
        className="task-check"
        role="checkbox"
        aria-checked={done}
        aria-disabled={readOnly}
        disabled={readOnly}
        aria-label={done ? `Reopen "${task.title}"` : `Complete "${task.title}"`}
        onClick={onToggle}
      >
        <Check size={12} weight="bold" />
      </button>
      <div className="task-main">
        <span className="title">{task.title}</span>
        <span className="chip">{task.category}</span>
        {task.effort === "quick" && <span className="chip">quick win</span>}
      </div>
      <div className="task-meta">
        <DeadlineStamp deadline={task.deadline} />
        <span
          className={`imp${task.importance >= 4 ? " high" : ""}`}
          title={`Importance ${task.importance} of 5`}
        >
          P{task.importance}
        </span>
      </div>
      {!readOnly && (
        <div className="row-actions">
          <button className="btn-quiet" aria-label={`Edit "${task.title}"`} onClick={onEdit}>
            <PencilSimple size={16} />
          </button>
          <button className="btn-quiet" aria-label={`Delete "${task.title}"`} onClick={onDelete}>
            <TrashSimple size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

function TasksSkeleton() {
  return (
    <div className="tasks-skeleton" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading tasks</span>
      {[88, 72, 80, 64, 76, 58].map((w, i) => (
        <div key={i} className={`skeleton skeleton-task skeleton-w-${w}`} aria-hidden="true" />
      ))}
    </div>
  );
}

export default function Tasks({ demo = false }) {
  const [tasks, setTasks] = useState(() => (demo ? demoTasks : null));
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (demo) return;
    api
      .tasks()
      .then(({ tasks: list }) => setTasks(list))
      .catch((err) => setError(err.message));
  }, [demo]);

  const grouped = useMemo(() => {
    if (!tasks) return null;
    const byStatus = Object.fromEntries(GROUPS.map((g) => [g.status, []]));
    for (const t of tasks) (byStatus[t.status] ?? byStatus.todo).push(t);
    byStatus.done.sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
    return byStatus;
  }, [tasks]);

  function patchLocal(updated) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  async function toggle(task) {
    const status = task.status === "done" ? "todo" : "done";
    patchLocal({ ...task, status });
    try {
      const { task: fresh } = await api.updateTask(task.id, { status });
      patchLocal(fresh);
    } catch (err) {
      patchLocal(task);
      setError(err.message);
    }
  }

  async function remove(task) {
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    const prev = tasks;
    setTasks((ts) => ts.filter((t) => t.id !== task.id));
    try {
      await api.deleteTask(task.id);
    } catch (err) {
      setTasks(prev);
      setError(err.message);
    }
  }

  async function create(input) {
    setSaving(true);
    setFormError(null);
    try {
      const { task } = await api.createTask(input);
      setTasks((ts) => [task, ...ts]);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(id, input) {
    setSaving(true);
    setFormError(null);
    try {
      const { task } = await api.updateTask(id, input);
      patchLocal(task);
      setEditing(null);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (error && !tasks) {
    return (
      <div className="error-note" role="alert">
        <span>Tasks could not be loaded: {error}</span>
        <button className="btn btn-ghost" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="tasks-intro">
        These are the commitments Orbit weighs each morning. Deadlines and importance shape what
        lands in your briefing.
      </p>

      {demo ? (
        <div className="demo-note">
          <strong>Read-only sample</strong>
          Task changes are unavailable in demo mode. Enter the private access token to work with
          the live ledger.
        </div>
      ) : (
        editing === null && <TaskForm saving={saving} error={formError} onSave={create} />
      )}

      {error && (
        <div className="error-note" role="alert">
          <span>{error}</span>
          <button className="btn btn-ghost" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {!grouped ? (
        <TasksSkeleton />
      ) : tasks.length === 0 ? (
        <div className="empty">
          <strong>The ledger is empty.</strong>
          Add your first task above. Tomorrow's 6 AM run will rank it.
        </div>
      ) : (
        GROUPS.map(({ status, label }) => {
          const items = grouped[status];
          if (items.length === 0) return null;
          return (
            <section className="task-group" key={status}>
              <h3>
                {label} <span className="count mono">{items.length}</span>
              </h3>
              {items.map((task) =>
                editing === task.id ? (
                  <div className="inline-edit" key={task.id}>
                    <TaskForm
                      initial={task}
                      saving={saving}
                      error={formError}
                      onSave={(input) => saveEdit(task.id, input)}
                      onCancel={() => {
                        setEditing(null);
                        setFormError(null);
                      }}
                    />
                  </div>
                ) : (
                  <TaskRow
                    key={task.id}
                    task={task}
                    readOnly={demo}
                    onToggle={() => toggle(task)}
                    onEdit={() => {
                      setEditing(task.id);
                      setFormError(null);
                    }}
                    onDelete={() => remove(task)}
                  />
                )
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
