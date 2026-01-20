import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RideService } from '../src/rides/ride.service';

describe('PUT /rides/:rideId/segments (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let rideService: RideService;

  const userId = 'test-user-001';
  const token = 'test-jwt-token'; // mock auth

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      // mock auth guard
      .overrideGuard(SupabaseAuthGuard)
      .useValue({
        canActivate: (ctx) => {
          const req = ctx.switchToHttp().getRequest();
          req.user = { userId };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    prisma = moduleRef.get(PrismaService);
    rideService = moduleRef.get(RideService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should save segments for a draft ride', async () => {
    // 1️⃣ 用 Service 创建一个 DRAFT Ride（真实逻辑）
    const rideId = await rideService.createDraftRideForTest(userId);

    // 2️⃣ 调用 PUT 接口
    await request(app.getHttpServer())
      .put(`/rides/${rideId}/segments`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        segments: [
          {
            orderIndex: 0,
            geometry: [
              [12.4924, 41.8902],
              [12.4927, 41.8906],
            ],
            lengthM: 600,
            report: {
              roadCondition: 'GOOD',
              issueType: 'NONE',
              notes: 'Smooth road',
            },
          },
        ],
      })
      .expect(200);

    // 3️⃣ 直接查数据库断言
    const segments = await prisma.rideSegment.findMany({
      where: { rideId },
      include: { report: true },
    });

    expect(segments).toHaveLength(1);
    expect(segments[0].orderIndex).toBe(0);
    expect(segments[0].report?.roadCondition).toBe('GOOD');
  });
});
