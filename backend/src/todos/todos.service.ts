import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TodosRepository } from './todos.repository.js';
import type {
  CreateTodoInput,
  TodoRecord,
  UpdateTodoInput,
} from './todo.types.js';

@Injectable()
export class TodosService {
  constructor(private readonly todosRepository: TodosRepository) {}

  findAll(): Promise<TodoRecord[]> {
    return this.todosRepository.findAll();
  }

  async findOne(id: string): Promise<TodoRecord> {
    const todo = await this.todosRepository.findById(id);
    if (!todo) throw new NotFoundException('Todo not found');
    return todo;
  }

  create(input: CreateTodoInput): Promise<TodoRecord> {
    return this.todosRepository.create({
      title: this.normalizeTitle(input.title),
      status: input.status ?? 'To Do',
    });
  }

  async update(id: string, input: UpdateTodoInput): Promise<TodoRecord> {
    if (input.title === undefined && input.status === undefined) {
      throw new BadRequestException('Provide a title or status to update');
    }
    const changes: UpdateTodoInput = {};
    if (input.title !== undefined)
      changes.title = this.normalizeTitle(input.title);
    if (input.status !== undefined) changes.status = input.status;
    const todo = await this.todosRepository.updateById(id, changes);
    if (!todo) throw new NotFoundException('Todo not found');
    return todo;
  }

  async remove(id: string): Promise<void> {
    if (!(await this.todosRepository.deleteById(id)))
      throw new NotFoundException('Todo not found');
  }

  private normalizeTitle(title: string): string {
    const trimmed = title.trim();
    if (!trimmed) throw new BadRequestException('Title cannot be blank');
    return trimmed;
  }
}
