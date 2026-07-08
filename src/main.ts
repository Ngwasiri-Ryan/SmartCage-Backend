import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable static asset serving for uploads (snapshots, face images)
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  // Enable global DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,       // Strip unknown fields
      forbidNonWhitelisted: true,
      transform: true,       // Auto-transform payloads to DTO types
    }),
  );

  // Enable CORS for Flutter app and ESP32 access
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`SmartCage API running on port ${port}`);
}

bootstrap();
