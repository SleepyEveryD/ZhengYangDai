import { Body, Controller, Post } from '@nestjs/common';
import { StreetResolverService } from '../report/street-resolver.service';

@Controller('report')
export class PathReportController {
  constructor(
    private readonly streetResolver: StreetResolverService
  ) {}

  @Post('resolve-streets')
  async resolveStreets(
    @Body() body: { points: { index: number; coord: [number, number] }[] }
  ) {
    return {
      streets: await this.streetResolver.resolveFromSampledPoints(body.points),
    };
  }
}
