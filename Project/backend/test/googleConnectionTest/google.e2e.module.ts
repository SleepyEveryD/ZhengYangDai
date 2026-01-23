import { Module } from '@nestjs/common';
import { GoogleE2EController } from './google.e2e.controller';

@Module({
  controllers: [GoogleE2EController],
})
export class GoogleE2EModule {}
