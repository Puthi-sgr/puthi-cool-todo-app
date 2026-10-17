import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { STATUSES } from "./types";
import type { Todo, TodoStatus } from "./types";
import { todosApi } from "./api/todos";

vi.mock("./api/todos", () => ({ todosApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() } }));

let savedTodos: Todo[];
beforeEach(() => {
  savedTodos = [];
  vi.mocked(todosApi.list).mockImplementation(async () => savedTodos.map((todo) => ({ ...todo })));
  vi.mocked(todosApi.create).mockImplementation(async (title, status) => {
    const todo = { id: crypto.randomUUID(), title, status };
    savedTodos.push(todo);
    return todo;
  });
  vi.mocked(todosApi.update).mockImplementation(async (id, title, status) => {
    const todo = { id, title, status };
    savedTodos = savedTodos.map((item) => item.id === id ? todo : item);
    return todo;
  });
  vi.mocked(todosApi.remove).mockImplementation(async (id) => { savedTodos = savedTodos.filter((item) => item.id !== id); });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function addTask(
  user: ReturnType<typeof userEvent.setup>,
  title = "Learn React",
  status: TodoStatus = "To Do",
) {
  const form = within(screen.getByRole("form", { name: "Add task" }));
  await waitFor(() => expect(form.getByRole("button", { name: "Add task" })).toBeEnabled());
  await user.click(form.getByLabelText("Task title"));
  await user.paste(title);
  await user.selectOptions(form.getByLabelText("Status"), status);
  await user.click(form.getByRole("button", { name: "Add task" }));
  await waitFor(() => expect(form.getByRole("button", { name: "Add task" })).toBeEnabled());
}

describe("Todo workspace", () => {
  it("starts empty with a default profile and To Do selected", async () => {
    render(<App />);
    expect(await screen.findByText("A fresh start.")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Chetha Puthi" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Status")).toHaveValue("To Do");
  });

  it.each(STATUSES)(
    "creates and reads a trimmed task with status %s",
    async (status) => {
      const user = userEvent.setup();
      render(<App />);
      await addTask(user, "  Learn React  ", status);
      const row = screen.getByRole("listitem");
      expect(within(row).getByText("Learn React")).toBeInTheDocument();
      expect(within(row).getByText(status)).toBeInTheDocument();
      expect(screen.getByLabelText("Task title")).toHaveValue("");
      expect(screen.getByLabelText("Status")).toHaveValue("To Do");
      expect(
        screen.getByText(
          status === "Done" ? "1 of 1 completed" : "0 of 1 completed",
        ),
      ).toBeInTheDocument();
    },
  );

  it("rejects empty and whitespace titles with an accessible error", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText("A fresh start.");
    await user.click(screen.getByRole("button", { name: "Add task" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a title");
    expect(screen.getByLabelText("Task title")).toHaveAccessibleDescription(
      "Enter a title for your task.",
    );
    await addTask(user, "   ");
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("edits title and status, validates edits, and supports cancel", async () => {
    const user = userEvent.setup();
    render(<App />);
    await addTask(user);
    await user.click(screen.getByRole("button", { name: "Edit Learn React" }));
    let form = within(screen.getByRole("form", { name: "Edit task" }));
    await user.clear(form.getByLabelText("Task title"));
    await user.click(form.getByRole("button", { name: "Save task" }));
    expect(form.getByRole("alert")).toBeInTheDocument();
    await user.type(form.getByLabelText("Task title"), "  Build components  ");
    await user.selectOptions(form.getByLabelText("Status"), "In Progress");
    await user.click(form.getByRole("button", { name: "Save task" }));
    expect(
      within(screen.getByRole("listitem")).getByText("In Progress"),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Edit Build components" }),
    );
    form = within(screen.getByRole("form", { name: "Edit task" }));
    await user.type(form.getByLabelText("Task title"), " discarded");
    await user.selectOptions(form.getByLabelText("Status"), "Done");
    await user.click(form.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("Build components")).toBeInTheDocument();
    expect(
      within(screen.getByRole("listitem")).getByText("In Progress"),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Edit Build components" }),
    );
    form = within(screen.getByRole("form", { name: "Edit task" }));
    await user.selectOptions(form.getByLabelText("Status"), "Done");
    await user.click(form.getByRole("button", { name: "Save task" }));
    expect(screen.getByText("1 of 1 completed")).toBeInTheDocument();
  });

  it("requires confirmation before deleting and returns to the empty state", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<App />);
    await addTask(user);
    await user.click(
      screen.getByRole("button", { name: "Delete Learn React" }),
    );
    expect(confirm).toHaveBeenCalledWith("Delete “Learn React”?");
    expect(screen.getByText("Learn React")).toBeInTheDocument();
    confirm.mockReturnValue(true);
    await user.click(
      screen.getByRole("button", { name: "Delete Learn React" }),
    );
    expect(screen.getByText("A fresh start.")).toBeInTheDocument();
  });

  it("keeps duplicate titles independent and renders long titles literally", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<App />);
    await addTask(user);
    await addTask(user);
    await user.click(
      screen.getAllByRole("button", { name: "Delete Learn React" })[0],
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    const longTitle = "<script>alert(1)</script>" + "x".repeat(250);
    await addTask(user, longTitle);
    expect(screen.getByText(longTitle)).toBeInTheDocument();
  });

  it("saves a trimmed username across the header and profile and cancels drafts", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    await user.clear(screen.getByLabelText("Username"));
    await user.type(screen.getByLabelText("Username"), "  React Student  ");
    await user.click(screen.getByRole("button", { name: "Save profile" }));
    expect(
      screen.getByRole("link", { name: "React Student" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "React Student" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    await user.type(screen.getByLabelText("Username"), " ignored");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    expect(screen.getByLabelText("Username")).toHaveValue("React Student");
  });

  it("rejects a blank username", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    await user.clear(screen.getByLabelText("Username"));
    await user.type(screen.getByLabelText("Username"), "   ");
    await user.click(screen.getByRole("button", { name: "Save profile" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a username.");
    expect(
      screen.getByRole("link", { name: "Chetha Puthi" }),
    ).toBeInTheDocument();
  });

  it("reloads persisted tasks on remount while the profile stays local", async () => {
    const storageSpy = vi.spyOn(Storage.prototype, "setItem");
    const user = userEvent.setup();
    const view = render(<App />);
    await addTask(user);
    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    await user.clear(screen.getByLabelText("Username"));
    await user.type(screen.getByLabelText("Username"), "Temporary name");
    await user.click(screen.getByRole("button", { name: "Save profile" }));
    view.unmount();
    render(<App />);
    expect(await screen.findByText("Learn React")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Chetha Puthi" }),
    ).toBeInTheDocument();
    expect(todosApi.list).toHaveBeenCalledTimes(2);
    expect(storageSpy).not.toHaveBeenCalled();
  });

  it("supports keyboard task submission and visible input focus", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText("A fresh start.");
    await user.click(screen.getByLabelText("Task title"));
    await user.keyboard("Keyboard task{Enter}");
    expect(screen.getByText("Keyboard task")).toBeInTheDocument();
    expect(screen.getByLabelText("Task title")).toHaveFocus();
  });

  it("shows a load failure and lets the user retry", async () => {
    vi.mocked(todosApi.list).mockRejectedValueOnce(new Error("Connection unavailable"));
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Connection unavailable");
    expect(screen.getByRole("button", { name: "Add task" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Retry loading tasks" }));
    expect(await screen.findByText("A fresh start.")).toBeInTheDocument();
  });

  it("preserves the draft after a failed create", async () => {
    vi.mocked(todosApi.create).mockRejectedValueOnce(new Error("Save failed"));
    const user = userEvent.setup();
    render(<App />);
    await addTask(user, "Keep this draft", "In Progress");
    expect(screen.getByRole("alert")).toHaveTextContent("Save failed");
    expect(screen.getByLabelText("Task title")).toHaveValue("Keep this draft");
    expect(screen.getByLabelText("Status")).toHaveValue("In Progress");
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("prevents duplicate submissions while a create is pending", async () => {
    let finish!: (todo: Todo) => void;
    vi.mocked(todosApi.create).mockImplementationOnce(() => new Promise<Todo>((resolve) => { finish = resolve; }));
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText("A fresh start.");
    await user.type(screen.getByLabelText("Task title"), "One request");
    await user.click(screen.getByRole("button", { name: "Add task" }));
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    await user.click(screen.getByLabelText("Task title"));
    await user.keyboard("{Enter}");
    expect(todosApi.create).toHaveBeenCalledTimes(1);
    finish({ id: "server-id", title: "One request", status: "To Do" });
    expect(await screen.findByText("One request")).toBeInTheDocument();
  });

  it("keeps the edit form and delete target when requests fail", async () => {
    const user = userEvent.setup();
    render(<App />);
    await addTask(user);
    vi.mocked(todosApi.update).mockRejectedValueOnce(new Error("Update failed"));
    await user.click(screen.getByRole("button", { name: "Edit Learn React" }));
    const form = within(screen.getByRole("form", { name: "Edit task" }));
    await user.clear(form.getByLabelText("Task title"));
    await user.type(form.getByLabelText("Task title"), "Unsaved change");
    await user.click(form.getByRole("button", { name: "Save task" }));
    expect(await form.findByRole("alert")).toHaveTextContent("Update failed");
    expect(form.getByLabelText("Task title")).toHaveValue("Unsaved change");
    await user.click(form.getByRole("button", { name: "Cancel" }));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(todosApi.remove).mockRejectedValueOnce(new Error("Delete failed"));
    await user.click(screen.getByRole("button", { name: "Delete Learn React" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Delete failed");
    expect(screen.getByText("Learn React")).toBeInTheDocument();
  });
});
