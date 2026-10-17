import { ApiProperty } from '@nestjs/swagger';
import { TODO_STATUSES } from '../todo.types.js';
import type { TodoRecord, TodoStatus } from '../todo.types.js';

export class TodoResponseDto implements TodoRecord {
  @ApiProperty({
    format: 'uuid',
    example: 'b63c4ab5-5d92-4b30-95be-f6b9f0014cad',
  })
  id: string;

  @ApiProperty({ example: 'Learn NestJS' })
  title: string;

  @ApiProperty({ enum: [...TODO_STATUSES], example: 'To Do' })
  status: TodoStatus;
}
