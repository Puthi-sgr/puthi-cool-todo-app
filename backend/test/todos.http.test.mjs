import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { TodosController } from '../dist/todos/todos.controller.js';
import { TodosService } from '../dist/todos/todos.service.js';
import { TodosRepository } from '../dist/todos/todos.repository.js';
import { configureApp } from '../dist/configure-app.js';
import { setupSwagger } from '../dist/swagger.js';

test('Todo HTTP contract, validation, Swagger, and CORS without a database', async () => {
  const rows = new Map();
  const repository = {
    findAll: async () => [...rows.values()],
    findById: async (id) => rows.get(id) ?? null,
    create: async (input) => {
      const row = { id: randomUUID(), ...input };
      rows.set(row.id, row);
      return row;
    },
    updateById: async (id, changes) => {
      if (!rows.has(id)) return null;
      const row = { ...rows.get(id), ...changes };
      rows.set(id, row);
      return row;
    },
    deleteById: async (id) => rows.delete(id),
  };
  class HttpTestModule {}
  Module({
    controllers: [TodosController],
    providers: [
      TodosService,
      { provide: TodosRepository, useValue: repository },
    ],
  })(HttpTestModule);
  const app = await NestFactory.create(HttpTestModule, { logger: false });
  try {
    configureApp(app);
    setupSwagger(app);
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const request = (path, method = 'GET', body) =>
      fetch(`${base}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', Connection: 'close' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    assert.deepEqual(await (await request('/todos')).json(), []);
    for (const body of [
      {},
      { title: ' ' },
      { title: 42 },
      { title: null },
      { title: 'Task', status: null },
      { title: 'Task', status: 'done' },
      { title: 'Task', id: randomUUID() },
    ]) {
      assert.equal((await request('/todos', 'POST', body)).status, 400);
    }
    const created = await request('/todos', 'POST', { title: '  HTTP task  ' });
    assert.equal(created.status, 201);
    const todo = await created.json();
    assert.equal(todo.title, 'HTTP task');
    assert.equal(todo.status, 'To Do');
    assert.equal((await request(`/todos/${todo.id}`)).status, 200);
    for (const body of [
      {},
      { title: null },
      { status: null },
      { title: ' ' },
      { status: 'Other' },
      { id: randomUUID() },
    ]) {
      assert.equal(
        (await request(`/todos/${todo.id}`, 'PATCH', body)).status,
        400,
      );
    }
    const updated = await (
      await request(`/todos/${todo.id}`, 'PATCH', { status: 'Done' })
    ).json();
    assert.equal(updated.title, todo.title);
    assert.equal(updated.status, 'Done');
    for (const method of ['GET', 'PATCH', 'DELETE']) {
      const body = method === 'PATCH' ? { status: 'Done' } : undefined;
      assert.equal(
        (await request('/todos/not-a-uuid', method, body)).status,
        400,
      );
      assert.equal(
        (await request(`/todos/${randomUUID()}`, method, body)).status,
        404,
      );
    }
    const deleted = await request(`/todos/${todo.id}`, 'DELETE');
    assert.equal(deleted.status, 204);
    assert.equal(await deleted.text(), '');
    assert.deepEqual(await (await request('/todos')).json(), []);
    const spec = await (await request('/docs-json')).json();
    assert.ok(spec.paths['/todos'].post.requestBody);
    assert.ok(spec.paths['/todos/{id}'].patch);
    assert.ok(spec.components.schemas.TodoResponseDto);
    assert.equal((await request('/docs')).status, 200);
    const preflight = await fetch(`${base}/todos`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
        Connection: 'close',
      },
    });
    assert.equal(
      preflight.headers.get('access-control-allow-origin'),
      'http://localhost:5173',
    );
  } finally {
    await app.close();
  }
});
