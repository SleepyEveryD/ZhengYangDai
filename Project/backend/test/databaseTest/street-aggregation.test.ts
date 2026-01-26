import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting street aggregation test...');

  // ---------- 0. 清理旧数据（只清理测试相关表） ----------
  await prisma.streetReport.deleteMany();
  await prisma.streetAggregation.deleteMany();
  await prisma.street.deleteMany();
  await prisma.ride.deleteMany();

  // ---------- 1. 创建 Ride ----------
  const ride1 = await prisma.$queryRaw<{ id: string }[]>`
    INSERT INTO "Ride" (
      id,
      "userId",
      "routeGeometry",
      status,
      "startedAt",
      "endedAt"
    )
    VALUES (
      gen_random_uuid(),
      'user_1',
      ST_GeomFromText('LINESTRING(12.4924 41.8902, 12.4934 41.8912)', 4326),
      'CONFIRMED'::"RideStatus",
      NOW(),
      NOW()
    )
    RETURNING id
  `;

  const ride2 = await prisma.$queryRaw<{ id: string }[]>`
    INSERT INTO "Ride" (
      id,
      "userId",
      "routeGeometry",
      status,
      "startedAt",
      "endedAt"
    )
    VALUES (
      gen_random_uuid(),
      'user_2',
      ST_GeomFromText('LINESTRING(12.4925 41.8903, 12.4935 41.8913)', 4326),
      'CONFIRMED'::"RideStatus",
      NOW(),
      NOW()
    )
    RETURNING id
  `;

  console.log('✅ Created rides');

  // ---------- 2. 创建 Street ----------
  const street = await prisma.$queryRaw<{ id: string }[]>`
    INSERT INTO "Street" (
      id,
      "externalId",
      name,
      city,
      country,
      geometry
    )
    VALUES (
      gen_random_uuid(),
      'osm_test_001',
      'Via Test',
      'Rome',
      'Italy',
      ST_GeomFromText('LINESTRING(12.4924 41.8902, 12.4934 41.8912)', 4326)
    )
    RETURNING id
  `;

  console.log('✅ Created street');

  // ---------- 3. 插入 StreetReport（触发 trigger） ----------
  await prisma.streetReport.create({
    data: {
      userId: 'user_1',
      rideId: ride1[0].id,
      streetId: street[0].id,
      roadCondition: 'GOOD',
      notes: 'Smooth ride'
    }
  });

  await prisma.streetReport.create({
    data: {
      userId: 'user_2',
      rideId: ride2[0].id,
      streetId: street[0].id,
      roadCondition: 'FAIR',
      notes: 'Some bumps'
    }
  });

  console.log('✅ Created street reports');

  // ---------- 4. 验证聚合是否生成 ----------
  const aggregation = await prisma.streetAggregation.findUnique({
    where: { streetId: street[0].id }
  });

  console.log('📊 Aggregation result:');
  console.log(JSON.stringify(aggregation, null, 2));

  if (!aggregation) {
    throw new Error('❌ Aggregation was not created');
  }

  console.log('🎉 Test passed: aggregation trigger works');
}

main()
  .catch((e) => {
    console.error('❌ Test failed');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
