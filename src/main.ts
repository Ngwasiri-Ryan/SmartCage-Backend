import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
  await app.listen(port);
  console.log(`SmartCage API running on port ${port}`);
}

bootstrap();
