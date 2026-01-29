import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      'http://localhost:5173',          // 本地前端（如果有）
      'http://localhost:3000',          // 本地测试
      'https://zheng-yang-dai.vercel.app', // 线上前端
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false, // 你现在是 Bearer token，不用 cookie
  });

  await app.listen(3000);
}


bootstrap();
