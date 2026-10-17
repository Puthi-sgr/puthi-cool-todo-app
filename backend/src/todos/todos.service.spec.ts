import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TodosService } from './todos.service.js';
import type { TodosRepository } from './todos.repository.js';

describe('TodosService', () => {
  const todo = {
    id: 'b63c4ab5-5d92-4b30-95be-f6b9f0014cad',
    title: 'Task',
    status: 'To Do' as const,
  };
  let repository: { [K in keyof TodosRepository]: ReturnType<typeof vi.fn> };
  let service: TodosService;

  beforeEach(() => {
    repository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      updateById: vi.fn(),
      deleteById: vi.fn(),
    };
    service = new TodosService(repository as unknown as TodosRepository);
  });

  it('normalizes titles and supplies the default status', async () => {
    repository.create.mockResolvedValue(todo);
    await expect(service.create({ title: '  Task  ' })).resolves.toEqual(todo);
    expect(repository.create).toHaveBeenCalledWith({
      title: 'Task',
      status: 'To Do',
    });
  });

  it('does not send blank titles or empty updates to persistence', async () => {
    expect(() => service.create({ title: '  ' })).toThrow(BadRequestException);
    await expect(service.update(todo.id, {})).rejects.toThrow(
      BadRequestException,
    );
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.updateById).not.toHaveBeenCalled();
  });

  it('preserves omitted fields in a partial update', async () => {
    repository.updateById.mockResolvedValue({ ...todo, status: 'Done' });
    await service.update(todo.id, { status: 'Done' });
    expect(repository.updateById).toHaveBeenCalledWith(todo.id, {
      status: 'Done',
    });
  });

  it('reports missing reads, updates and deletes', async () => {
    repository.findById.mockResolvedValue(null);
    repository.updateById.mockResolvedValue(null);
    repository.deleteById.mockResolvedValue(false);
    await expect(service.findOne(todo.id)).rejects.toThrow(NotFoundException);
    await expect(service.update(todo.id, { status: 'Done' })).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.remove(todo.id)).rejects.toThrow(NotFoundException);
  });

  it('propagates database failures instead of reporting success', async () => {
    repository.deleteById.mockRejectedValue(new Error('Database unavailable'));
    await expect(service.remove(todo.id)).rejects.toThrow(
      'Database unavailable',
    );
  });
});
