import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      'http://localhost:5173',          // local frontend dev
      'http://localhost:3000',          // local backend dev
      'https://zheng-yang-dai.vercel.app', // deployed frontend
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false, // No cookies/auth needed
  });

  await app.listen(3000);
}


bootstrap();
