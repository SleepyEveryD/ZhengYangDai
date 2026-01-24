import 'dotenv/config';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from '../../src/app.module';

describe('PathReport – Resolve Streets (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // ✅ 确保 Google API Key 存在
    expect(process.env.GOOGLE_MAPS_API_KEY).toBeDefined();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should resolve streets from sampled GeoJSON route', async () => {
    // ✅ 你给的 mock 路线
    const routeGeoJsonMock: GeoJSON.LineString = {
      type: 'LineString',
      coordinates: [
        [9.18760, 45.46350],
        [9.18820, 45.46355],
        [9.18890, 45.46360],
        [9.18940, 45.46362],
        [9.18980, 45.46390],
        [9.18985, 45.46440],
        [9.18988, 45.46495],
        [9.19020, 45.46530],
        [9.19060, 45.46560],
      ],
    };

    // ✅ 直接在测试里把 LineString → 前端已抽样点
    const points = routeGeoJsonMock.coordinates.map(
      (coord, index) => ({
        index,
        coord, // [lng, lat]
      })
    );

    const res = await request(app.getHttpServer())
      .post('/report/resolve-streets')
      .send({ points })
      .expect(201 || 200); // 取决于你 controller 用 Post 还是 HttpCode

    // ===== 基本结构校验 =====
    expect(res.body).toHaveProperty('streets');
    expect(Array.isArray(res.body.streets)).toBe(true);
    expect(res.body.streets.length).toBeGreaterThan(0);

    const street = res.body.streets[0];

    // ===== street 字段校验 =====
    expect(street).toHaveProperty('externalId');
    expect(typeof street.externalId).toBe('string');

    expect(street).toHaveProperty('name');
    expect(typeof street.name).toBe('string');

    expect(street).toHaveProperty('city');
    expect(street).toHaveProperty('country');

    // ===== positions 校验 =====
    expect(street).toHaveProperty('positions');
    expect(Array.isArray(street.positions)).toBe(true);
    expect(street.positions.length).toBeGreaterThan(0);

    const pos = street.positions[0];
    expect(pos).toHaveProperty('index');
    expect(typeof pos.index).toBe('number');

    expect(pos).toHaveProperty('coord');
    expect(Array.isArray(pos.coord)).toBe(true);
    expect(pos.coord.length).toBe(2);

    // 👉 调试输出（很有用）
    console.log(
      'Resolved streets:',
      res.body.streets.map((s) => ({
        name: s.name,
        city: s.city,
        country: s.country,
        points: s.positions.length,
      }))
    );
  });
});
