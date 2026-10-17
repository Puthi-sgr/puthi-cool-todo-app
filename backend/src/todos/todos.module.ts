import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Todo } from './todo.entity.js';
import { TodosController } from './todos.controller.js';
import { TodosService } from './todos.service.js';
import { TodosRepository } from './todos.repository.js';

@Module({
  imports: [TypeOrmModule.forFeature([Todo])],
  controllers: [TodosController],
  providers: [TodosService, TodosRepository],
})
export class TodosModule {}
