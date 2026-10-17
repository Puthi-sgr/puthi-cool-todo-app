import { afterEach, describe, expect, it, vi } from "vitest";
import { todosApi } from "./todos";

afterEach(() => vi.unstubAllGlobals());

describe("Todo API client", () => {
  it("posts JSON and returns the server-generated ID", async () => {
    const todo = { id: "server-id", title: "Task", status: "To Do" };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(todo), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(todosApi.create("Task", "To Do")).resolves.toEqual(todo);
    expect(fetchMock).toHaveBeenCalledWith("/api/todos", expect.objectContaining({ method: "POST", body: JSON.stringify({ title: "Task", status: "To Do" }) }));
  });

  it("accepts an empty successful delete response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(todosApi.remove("id")).resolves.toBeUndefined();
  });

  it("shows validation messages but hides internal server errors", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: ["title must be a string"] }), { status: 400 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "private database details" }), { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(todosApi.create("Task", "To Do")).rejects.toThrow("title must be a string");
    await expect(todosApi.list()).rejects.toThrow("The server could not save or load your tasks");
  });

  it("reports network failures and preserves abort behavior", async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockRejectedValueOnce(new DOMException("Aborted", "AbortError"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(todosApi.list()).rejects.toThrow("Could not reach the server");
    await expect(todosApi.list()).rejects.toMatchObject({ name: "AbortError" });
  });
});
