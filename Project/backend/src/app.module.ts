import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
//import { PrismaModule } from './prisma/prisma.module';
//import { PathReportModule } from './path-report/path-report.module';
import { AuthModule } from './auth/auth.module';
import { TestModule } from './debug/debug.module';
import { TripsModule } from "./trips/trips.module";
import { MapModule } from './map/map.module';
import { RoutesModule } from './routes/routes.module';
import { WeatherModule } from './weather/weather.module';

import { WeathertestController } from './weathertest/weathertest.controller';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
   // PrismaModule,
   // TripsModule,
    AuthModule,
    //PathReportModule,
   // TestModule, // test route
    MapModule,
    //RoutesApiModule,
    RoutesModule,
    WeatherModule,
  ],
  controllers: [AppController, WeathertestController],
  providers: [AppService],
})
export class AppModule {}

