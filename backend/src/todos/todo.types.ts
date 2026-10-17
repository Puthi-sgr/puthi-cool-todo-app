export const TODO_STATUSES = ['To Do', 'In Progress', 'Done'] as const;
export type TodoStatus = (typeof TODO_STATUSES)[number];

export interface TodoRecord {
  id: string;
  title: string;
  status: TodoStatus;
}

export interface CreateTodoInput {
  title: string;
  status?: TodoStatus;
}

export interface UpdateTodoInput {
  title?: string;
  status?: TodoStatus;
}
