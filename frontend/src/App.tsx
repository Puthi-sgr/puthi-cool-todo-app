import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowUpRight,
  Check,
  CheckCheck,
  Circle,
  ClipboardList,
  Pencil,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";
import { STATUSES } from "./types";
import type { Todo, TodoStatus } from "./types";
import { todosApi } from "./api/todos";

const statusClass = (status: TodoStatus) =>
  status === "Done"
    ? "done"
    : status === "In Progress"
      ? "progress"
      : "pending";

function TodoForm({
  initial,
  onSave,
  onCancel,
  disabled = false,
}: {
  initial?: Todo;
  onSave: (title: string, status: TodoStatus) => Promise<void>;
  onCancel?: () => void;
  disabled?: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [status, setStatus] = useState<TodoStatus>(initial?.status ?? "To Do");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const prefix = initial ? `edit-${initial.id}` : "new";
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (savingRef.current || disabled) return;
    if (!title.trim()) {
      setError("Enter a title for your task.");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      await onSave(title.trim(), status);
      if (!initial) {
        setTitle("");
        setStatus("To Do");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save your task. Please try again.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  return (
    <form
      className="todo-form"
      onSubmit={submit}
      aria-busy={saving}
      aria-label={initial ? "Edit task" : "Add task"}
    >
      <div className="title-field">
        <label htmlFor={`${prefix}-title`}>Task title</label>
        <input
          id={`${prefix}-title`}
          value={title}
          readOnly={saving || disabled}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What would you like to get done?"
          aria-invalid={!!error}
          aria-describedby={error ? `${prefix}-error` : undefined}
          autoFocus={!!initial}
        />
        {error && (
          <p className="error" id={`${prefix}-error`} role="alert">
            {error}
          </p>
        )}
      </div>
      <div>
        <label htmlFor={`${prefix}-status`}>Status</label>
        <select
          id={`${prefix}-status`}
          value={status}
          disabled={saving || disabled}
          onChange={(event) => setStatus(event.target.value as TodoStatus)}
        >
          {STATUSES.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </div>
      <div className="form-actions">
        <button className="primary" type="submit" disabled={saving || disabled}>
          {initial ? <Check size={17} /> : <Plus size={17} />}
          {saving ? "Saving…" : initial ? "Save task" : "Add task"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={saving || disabled}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function Profile({
  username,
  onSave,
}: {
  username: string;
  onSave: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(username);
  const [error, setError] = useState("");
  const initials = username
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim()) {
      setError("Enter a username.");
      return;
    }
    onSave(draft.trim());
    setEditing(false);
    setError("");
  }
  return (
    <aside className="profile panel" aria-labelledby="profile-heading">
      <div className="section-heading">
        <h2 id="profile-heading">Account / Profile</h2>
        <UserRound size={18} />
      </div>
      <div className="avatar" aria-hidden="true">
        {initials}
      </div>
      <h3 className="profile-name">{username}</h3>
      <p className="muted">Your personal workspace</p>
      <div className="profile-divider" />
      {editing ? (
        <form onSubmit={submit} aria-label="Edit profile">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            autoFocus
            aria-invalid={!!error}
            aria-describedby={error ? "username-error" : undefined}
          />
          {error && (
            <p id="username-error" className="error" role="alert">
              {error}
            </p>
          )}
          <div className="profile-actions">
            <button type="submit" className="primary">
              Save profile
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError("");
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <span className="field-caption">USERNAME</span>
          <p className="username-value">{username}</p>
          <button
            className="edit-profile"
            onClick={() => {
              setDraft(username);
              setEditing(true);
            }}
          >
            <Pencil size={15} /> Edit profile
          </button>
        </>
      )}
      <div className="session-note">
        <Circle size={9} fill="currentColor" />
        <span>
          Tasks are saved<p>Your profile name resets when you refresh.</p>
        </span>
      </div>
    </aside>
  );
}

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [username, setUsername] = useState("Chetha Puthi");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [mutating, setMutating] = useState(false);
  const mutationRef = useRef(false);
  const loadTodos = useCallback(async (signal?: AbortSignal) => {
    try {
      const savedTodos = await todosApi.list(signal);
      if (!signal?.aborted) setTodos(savedTodos);
    } catch (error) {
      if (!signal?.aborted) setLoadError(error instanceof Error ? error.message : "Could not load tasks.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadTodos(controller.signal);
    return () => controller.abort();
  }, [loadTodos]);

  async function mutate(operation: () => Promise<void>) {
    if (mutationRef.current) throw new Error("Please wait for the current task to finish saving.");
    mutationRef.current = true;
    setMutating(true);
    setActionError("");
    try { await operation(); }
    finally { mutationRef.current = false; setMutating(false); }
  }

  async function deleteTodo(todo: Todo) {
    if (mutationRef.current || !window.confirm(`Delete “${todo.title}”?`)) return;
    try {
      await mutate(async () => {
        await todosApi.remove(todo.id);
        setTodos((current) => current.filter((item) => item.id !== todo.id));
      });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not delete your task.");
    }
  }
  const completed = todos.filter((todo) => todo.status === "Done").length;
  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="#main">
            <span className="brand-icon">
              <CheckCheck size={23} />
            </span>
            Taskspace
            <span className="brand-divider" />
            <span className="workspace-label">Personal workspace</span>
          </a>
          <a className="header-profile" href="#profile-heading">
            <span className="mini-avatar">
              <UserRound size={17} />
            </span>
            <span>{username}</span>
            <ArrowUpRight size={15} />
          </a>
        </div>
      </header>
      <main id="main" className="workspace">
        <div className="page-heading">
          <div>
            <p className="eyebrow">A LITTLE FOCUS, EVERY DAY</p>
            <h1>Make room for progress.</h1>
            <p className="subtitle">
              A clear place for your tasks. One step at a time.
            </p>
          </div>
          <span className="personal-tag">
            <span /> Personal
          </span>
        </div>
        <div className="workspace-grid">
          <section aria-labelledby="tasks-heading" className="tasks-column">
            <div className="stats" aria-label="Task summary">
              {STATUSES.map((status) => (
                <div className="stat" key={status}>
                  <span className={`status-dot ${statusClass(status)}`} />
                  <span>{status}</span>
                  <strong>
                    {todos
                      .filter((todo) => todo.status === status)
                      .length.toString()
                      .padStart(2, "0")}
                  </strong>
                </div>
              ))}
            </div>
            <section
              className="panel composer"
              aria-labelledby="new-task-heading"
            >
              <h2 id="new-task-heading">What's next?</h2>
              <p className="muted">Give your next step a name.</p>
              <TodoForm
                disabled={loading || !!loadError || mutating}
                onSave={(title, status) => mutate(async () => {
                  const saved = await todosApi.create(title, status);
                  setTodos((current) => [...current, saved]);
                })}
              />
            </section>
            <section className="panel task-list">
              <div className="task-list-heading">
                <h2 id="tasks-heading">
                  Your tasks <span className="count">{todos.length}</span>
                </h2>
                <span className="muted">
                  {completed} of {todos.length} completed
                </span>
              </div>
              {actionError && <p className="error" role="alert">{actionError}</p>}
              {loading ? (
                <p role="status">Loading tasks…</p>
              ) : loadError ? (
                <div role="alert">
                  <p className="error">{loadError}</p>
                  <button type="button" onClick={() => {
                    setLoading(true);
                    setLoadError("");
                    void loadTodos();
                  }}>Retry loading tasks</button>
                </div>
              ) : !todos.length ? (
                <div className="empty-state">
                  <span className="empty-icon">
                    <ClipboardList size={30} strokeWidth={1.5} />
                  </span>
                  <h3>A fresh start.</h3>
                  <p>
                    No tasks yet. Add your first one above
                    <br />
                    and turn a little intention into progress.
                  </p>
                </div>
              ) : (
                <ul>
                  {todos.map((todo) => (
                    <li key={todo.id}>
                      {editingId === todo.id ? (
                        <TodoForm
                          initial={todo}
                          disabled={mutating}
                          onCancel={() => setEditingId(null)}
                          onSave={(title, status) => mutate(async () => {
                            const saved = await todosApi.update(todo.id, title, status);
                            setTodos((current) => current.map((item) => item.id === todo.id ? saved : item));
                            setEditingId(null);
                          })}
                        />
                      ) : (
                        <>
                          <span
                            className={`task-marker ${statusClass(todo.status)}`}
                            aria-hidden="true"
                          >
                            {todo.status === "Done" ? (
                              <Check size={15} />
                            ) : (
                              <Circle size={15} />
                            )}
                          </span>
                          <span
                            className={`task-title ${todo.status === "Done" ? "completed-title" : ""}`}
                          >
                            {todo.title}
                          </span>
                          <span
                            className={`status-badge ${statusClass(todo.status)}`}
                          >
                            {todo.status}
                          </span>
                          <div className="task-actions">
                            <button
                              aria-label={`Edit ${todo.title}`}
                              disabled={mutating}
                              onClick={() => setEditingId(todo.id)}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              className="delete-button"
                              aria-label={`Delete ${todo.title}`}
                              disabled={mutating}
                              onClick={() => void deleteTodo(todo)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </section>
          <Profile username={username} onSave={setUsername} />
        </div>
        <footer>
          <CheckCheck size={15} /> Small steps. Steady progress.
          <span>Made for your everyday.</span>
        </footer>
      </main>
    </>
  );
}
