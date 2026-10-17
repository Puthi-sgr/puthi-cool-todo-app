import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Todo Backend API')
    .setDescription('API documentation for the Taskspace Todo backend.')
    .setVersion('1.0')
    .build();

  SwaggerModule.setup('docs', app, () => SwaggerModule.createDocument(app, config), {
    jsonDocumentUrl: 'docs-json',
    customSiteTitle: 'Todo Backend API Docs',
    swaggerOptions: {
      docExpansion: 'list',
      operationsSorter: 'alpha',
      tagsSorter: 'alpha',
    },
  });
}
