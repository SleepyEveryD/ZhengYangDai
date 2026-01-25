//npx jest --config test/jest-e2e.json rides.e2e-spec.ts
//it tests it can confirm function 
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import axios from 'axios';
import { AppModule } from '../../src/app.module';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Ride e2e (dirty db allowed)', () => {
  let app: INestApplication;
  let server: any;

  const userId = 'e2e-user';
  const rideId = `e2e-ride-${Date.now()}`;

  /**
   * mock SupabaseAuthGuard
   */
  const mockAuthGuard = {
    canActivate: (ctx) => {
      const req = ctx.switchToHttp().getRequest();
      req.user = { userId };
      return true;
    },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
        .overrideGuard(
        require('../../src/auth/supabase-auth.guard').SupabaseAuthGuard,
      )
      .useValue(mockAuthGuard)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });
  

  it('PUT /rides/:rideId → create draft ride', async () => {
    const geojson = {
      type: 'LineString',
      coordinates: [
        [116.397, 39.908],
        [116.398, 39.909],
      ],
    };

    const res = await request(server)
      .put(`/rides/${rideId}`)
      .send(geojson)
      .expect(200);

    expect(res.body.ok).toBe(true);
  });

  it('POST /rides/:rideId/confirm → success', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        snappedPoints: [
          { placeId: 'mock-place-1' },
          { placeId: 'mock-place-2' },
        ],
      },
    } as any);

    const res = await request(server)
      .post(`/rides/${rideId}/confirm`)
      .send({ publish: false })
      .expect(201);

    expect(res.body.ok).toBe(true);
  });

  it('POST /rides/:rideId/confirm again → 409', async () => {
    const res = await request(server)
      .post(`/rides/${rideId}/confirm`)
      .send({ publish: false })
      .expect(409);

    expect(res.body.message).toContain('confirmed');
  });
});
