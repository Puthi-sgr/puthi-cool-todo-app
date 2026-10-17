import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CreateTodoDto } from './dto/create-todo.dto.js';
import { UpdateTodoDto } from './dto/update-todo.dto.js';
import { TodoResponseDto } from './dto/todo-response.dto.js';
import { TodosService } from './todos.service.js';

@ApiTags('Todos')
@Controller('todos')
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  @Get()
  @ApiOperation({
    summary: 'List all todos',
    description: 'Returns todos in stable UUID order.',
  })
  @ApiOkResponse({ type: TodoResponseDto, isArray: true })
  findAll(): Promise<TodoResponseDto[]> {
    return this.todosService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a todo' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: TodoResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid UUID.' })
  @ApiNotFoundResponse({ description: 'Todo not found.' })
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<TodoResponseDto> {
    return this.todosService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a todo' })
  @ApiCreatedResponse({ type: TodoResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid title, status, or unexpected fields.',
  })
  create(@Body() input: CreateTodoDto): Promise<TodoResponseDto> {
    return this.todosService.create({
      title: input.title,
      status: input.status,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a todo title or status' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: TodoResponseDto })
  @ApiBadRequestResponse({
    description:
      'Invalid UUID, title, status, unexpected fields, or empty update.',
  })
  @ApiNotFoundResponse({ description: 'Todo not found.' })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() input: UpdateTodoDto,
  ): Promise<TodoResponseDto> {
    return this.todosService.update(id, {
      title: input.title,
      status: input.status,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a todo' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Todo deleted.' })
  @ApiBadRequestResponse({ description: 'Invalid UUID.' })
  @ApiNotFoundResponse({ description: 'Todo not found.' })
  remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<void> {
    return this.todosService.remove(id);
  }
}
