import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString, ValidateIf } from 'class-validator';
import { TODO_STATUSES } from '../todo.types.js';
import type { TodoStatus } from '../todo.types.js';

export class CreateTodoDto {
  @ApiProperty({ example: 'Learn NestJS' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ enum: [...TODO_STATUSES], default: 'To Do' })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsIn(TODO_STATUSES)
  status?: TodoStatus;
}
