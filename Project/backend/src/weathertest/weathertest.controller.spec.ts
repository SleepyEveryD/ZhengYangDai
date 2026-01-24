import { Test, TestingModule } from '@nestjs/testing';
import { WeathertestController } from './weathertest.controller';

describe('WeathertestController', () => {
  let controller: WeathertestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WeathertestController],
    }).compile();

    controller = module.get<WeathertestController>(WeathertestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
