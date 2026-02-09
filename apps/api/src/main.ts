import express from 'express';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth/auth';
import { AppModule } from './app.module';

async function bootstrap() {
  const server = express();

  // Mount BetterAuth BEFORE body parser — it needs the raw request body
  // Express v5 uses {*any} wildcard syntax (not * like v4)
  server.all('/api/auth/{*any}', toNodeHandler(auth));

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Budgety API')
    .setDescription('Family Budget Tracker API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
