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
    /*
    console.log(
      '[PathReportController] resolve-streets called, points =',
      body.points?.length
    );
    */
  
    const streets =
      await this.streetResolver.resolveFromSampledPoints(body.points);
    /*
    console.log(
      '[PathReportController] resolved streets =',
      JSON.stringify(streets, null, 2)
    );
    */
  
    return {
      streets,
    };
  }
  
}
