export const STATUSES = ["To Do", "In Progress", "Done"] as const;
export type TodoStatus = (typeof STATUSES)[number];
export interface Todo {
  id: string;
  title: string;
  status: TodoStatus;
}
