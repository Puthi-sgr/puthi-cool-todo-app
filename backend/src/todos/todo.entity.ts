import { Check, Column, Entity, PrimaryColumn } from 'typeorm';

import { TODO_STATUSES } from './todo.types.js';
import type { TodoStatus } from './todo.types.js';

@Entity('todos')
@Check('CHK_todos_title_not_blank', 'length(btrim("title")) > 0')
export class Todo {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id: string;

  @Column({ type: 'text' })
  title: string;

  @Column({
    type: 'enum',
    enum: [...TODO_STATUSES],
    enumName: 'todo_status',
    default: 'To Do',
  })
  status: TodoStatus;
}
