import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Todo } from './todo.entity.js';
import type {
  CreateTodoInput,
  TodoRecord,
  UpdateTodoInput,
} from './todo.types.js';

@Injectable()
export class TodosRepository {
  constructor(
    @InjectRepository(Todo) private readonly todos: Repository<Todo>,
  ) {}

  async findAll(): Promise<TodoRecord[]> {
    return this.todos.find({
      select: { id: true, title: true, status: true },
      order: { id: 'ASC' },
    });
  }

  async findById(id: string): Promise<TodoRecord | null> {
    return this.todos.findOne({
      where: { id },
      select: { id: true, title: true, status: true },
    });
  }

  async create(input: CreateTodoInput): Promise<TodoRecord> {
    const todo = this.todos.create({
      title: input.title,
      status: input.status ?? 'To Do',
    });
    const saved = await this.todos.save(todo);
    return { id: saved.id, title: saved.title, status: saved.status };
  }

  async updateById(
    id: string,
    input: UpdateTodoInput,
  ): Promise<TodoRecord | null> {
    const changes: UpdateTodoInput = {};
    if (input.title !== undefined) changes.title = input.title;
    if (input.status !== undefined) changes.status = input.status;
    const result = await this.todos
      .createQueryBuilder()
      .update(Todo)
      .set(changes)
      .where('id = :id', { id })
      .returning(['id', 'title', 'status'])
      .execute();
    const rows = result.raw as TodoRecord[];
    return rows[0] ?? null;
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await this.todos.delete({ id });
    return (result.affected ?? 0) > 0;
  }
}
