import { Test, TestingModule } from '@nestjs/testing';
import { PathReportController } from './path-report.controller';

describe('PathReportController', () => {
  let controller: PathReportController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PathReportController],
    }).compile();

    controller = module.get<PathReportController>(PathReportController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
