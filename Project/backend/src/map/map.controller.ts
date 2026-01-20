import { Controller, Get } from '@nestjs/common';
import { MapService } from './map.service';
import { Path } from './map.type';

@Controller('api/paths')
export class MapController {
  constructor(private readonly mapService: MapService) {}

  @Get()
  getPaths(): Path[] {
    return this.mapService.getPaths();
  }
}
