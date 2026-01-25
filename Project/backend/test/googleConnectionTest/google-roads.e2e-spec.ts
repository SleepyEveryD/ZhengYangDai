
//npx jest --config ./test/jest-e2e.json test/googleConnectionTest/google-roads.e2e-spec.ts
// APIKEY : GOOGLE_MAPS_API_KEY
import 'dotenv/config';
import axios from 'axios';

describe('Google Roads API connectivity (e2e)', () => {
  it('should connect to Google Roads API and return snappedPoints', async () => {
    // ✅ 确保 .env 生效
    expect(process.env.GOOGLE_MAPS_API_KEY).toBeDefined();

    const res = await axios.get(
      'https://roads.googleapis.com/v1/snapToRoads',
      {
        params: {
          path: [
            '41.8902,12.4922',
            '41.8905,12.4925',
            '41.8910,12.4930',
          ].join('|'),
          interpolate: true,
          key: process.env.GOOGLE_MAPS_API_KEY,
        },
        timeout: 5000,
      },
    );

    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('snappedPoints');
    expect(Array.isArray(res.data.snappedPoints)).toBe(true);
    expect(res.data.snappedPoints.length).toBeGreaterThan(0);
  });
});
