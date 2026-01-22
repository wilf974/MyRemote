// MyRemote API - Entry Point
// NestJS Application Bootstrap

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as helmet from 'helmet';
import * as compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Security headers (Helmet)
  app.use(helmet());

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });

  // Compression
  app.use(compression());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown properties
      forbidNonWhitelisted: true, // Throw error if unknown properties
      transform: true, // Auto-transform payloads to DTO instances
    }),
  );

  // API prefix
  app.setGlobalPrefix('api/v1');

  // OpenAPI (Swagger) Documentation
  const config = new DocumentBuilder()
    .setTitle('MyRemote API')
    .setDescription('Remote Support Platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('devices', 'Device management')
    .addTag('sessions', 'Remote sessions')
    .addTag('contacts', 'Address book')
    .addTag('audit', 'Audit logs')
    .addTag('enrollment', 'Device enrollment')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port, process.env.HOST || '0.0.0.0');

  console.log(`
    ┌─────────────────────────────────────────────────────────────┐
    │                 MyRemote API Started                        │
    ├─────────────────────────────────────────────────────────────┤
    │  Environment : ${process.env.NODE_ENV || 'development'}     │
    │  API URL     : http://localhost:${port}                     │
    │  API Docs    : http://localhost:${port}/api/docs            │
    │  Health      : http://localhost:${port}/api/v1/health       │
    └─────────────────────────────────────────────────────────────┘
  `);
}

bootstrap();
