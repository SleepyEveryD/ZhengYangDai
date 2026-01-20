import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
//import { PathReportModule } from './path-report/path-report.module';
import { AuthModule } from './auth/auth.module';
import { TestModule } from './debug/debug.module';
import { TripsModule } from "./trips/trips.module";
import { MapModule } from './map/map.module';
//import { RoutesApiModule } from './routes-api/routes-api.module';
import { RoutesModule } from './routes/routes.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    TripsModule,
    AuthModule,
    //PathReportModule,
    TestModule, // test route
    MapModule,
    //RoutesApiModule,
    RoutesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

