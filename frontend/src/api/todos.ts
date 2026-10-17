import type { Todo, TodoStatus } from "../types";

const baseUrl = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new Error("Could not reach the server. Check your connection and try again.", { cause: error });
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string | string[] } | null;
    const message = Array.isArray(body?.message) ? body.message.join(". ") : body?.message;
    throw new Error(response.status >= 500 ? "The server could not save or load your tasks. Please try again." : message || "The request failed. Please try again.");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const todosApi = {
  list: (signal?: AbortSignal) => request<Todo[]>("/todos", { signal }),
  create: (title: string, status: TodoStatus) => request<Todo>("/todos", {
    method: "POST", body: JSON.stringify({ title, status }),
  }),
  update: (id: string, title: string, status: TodoStatus) => request<Todo>(`/todos/${encodeURIComponent(id)}`, {
    method: "PATCH", body: JSON.stringify({ title, status }),
  }),
  remove: (id: string) => request<void>(`/todos/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
