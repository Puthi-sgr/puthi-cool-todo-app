import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ConfigService } from '@nestjs/config';
import type { DataSourceOptions } from 'typeorm';
import { Todo } from '../todos/todo.entity.js';
import { CreateTodos1792195200000 } from './migrations/1792195200000-create-todos.js';

export function databaseOptions(config: ConfigService): DataSourceOptions {
  return {
    type: 'postgres',
    host: config.getOrThrow<string>('DB_HOST'),
    port: Number(config.getOrThrow<string>('DB_PORT')),
    username: config.getOrThrow<string>('DB_USERNAME'),
    password: config.getOrThrow<string>('DB_PASSWORD'),
    database: config.getOrThrow<string>('DB_DATABASE'),
    schema: 'public',
    entities: [Todo],
    migrations: [CreateTodos1792195200000],
    synchronize: false,
    migrationsRun: false,
    ssl: {
      ca: readFileSync(resolve(process.cwd(), 'prod-ca-2021.crt'), 'utf8'),
      rejectUnauthorized: true,
    },
  };
}
