import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { PathReportModule } from './path-report/path-report.module';

@Module({
  imports: [PrismaModule, PathReportModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
