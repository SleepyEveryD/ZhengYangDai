import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { PathReportModule } from './path-report/path-report.module';
import { AuthModule } from './auth/auth.module';
import { TestModule } from './debug/debug.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    PathReportModule,
    TestModule, // test route
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
