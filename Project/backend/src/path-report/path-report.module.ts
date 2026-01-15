import { Module } from '@nestjs/common';
import { PathReportController } from './path-report.controller';
import { PathReportService } from './path-report.service';

@Module({
  controllers: [PathReportController],
  providers: [PathReportService]
})
export class PathReportModule {}
