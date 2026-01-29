
//Project/backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
//import { PathReportModule } from './path-report/path-report.module';
import { TestModule } from './debug/debug.module';
import {RideModule} from './rides/ride.module';
import { ReportModule } from "./report/report.module";
import { MapModule } from './map/map.module';
import { ProfileModule } from "./profile/profile.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    //PathReportModule,
    TestModule, // test route
    RideModule,
    ReportModule,
    MapModule,
    ProfileModule

  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

