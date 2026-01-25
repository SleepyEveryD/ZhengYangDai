import { Module } from '@nestjs/common';
import { StreetResolverService } from './street-resolver.service';
import { PathReportController } from './report.controller';


@Module({
    controllers: [PathReportController],
    providers: [StreetResolverService],
    exports: [StreetResolverService],
})
export class ReportModule {}
