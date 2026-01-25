import 'dotenv/config';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { GoogleE2EModule } from './google.e2e.module';

const request = require('supertest');

describe('Google Roads API connectivity (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [GoogleE2EModule], // ✅ 关键：不要直接塞 controller
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should connect to Google Roads API and return snappedPoints', async () => {
    expect(process.env.GOOGLE_MAPS_API_KEY).toBeDefined();

    const res = await request(app.getHttpServer())
      .get('/e2e/google/roads')
      .expect(200);

    expect(res.body).toHaveProperty('snappedPoints');
    expect(Array.isArray(res.body.snappedPoints)).toBe(true);
    expect(res.body.snappedPoints.length).toBeGreaterThan(0);
  });
});
