import { Controller, Get, Query } from '@nestjs/common';
import { RoutesService } from './routes.service';

@Controller('api/routes')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}
   @Get('ping')
  ping() {
    return { ok: true };
  }
  @Get()
  getRoutes(
    @Query('origin') origin?: string,
    @Query('destination') destination?: string,
  ) {
    return this.routesService.getRoutes(origin, destination);
  }
}
