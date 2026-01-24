
//Project/backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
//import { PathReportModule } from './path-report/path-report.module';
import { AuthModule } from './auth/auth.module';
import { TestModule } from './debug/debug.module';
import {RideModule} from './rides/ride.module';
import { ReportModule } from "./report/report.module.ts";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    //PathReportModule,
    TestModule, // test route
    RideModule,
    ReportModule

  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

