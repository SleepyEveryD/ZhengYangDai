import { Module } from '@nestjs/common';
import { TestController } from './debug.controller';

@Module({
  controllers: [TestController],
})
export class TestModule {}
