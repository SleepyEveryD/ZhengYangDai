import { Injectable } from "@nestjs/common"
import { PrismaService } from "../prisma/prisma.service"

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

 async getProfileSummary(userId: string) {
  
  const [ridesCount, reportsCount, distanceRow] = await Promise.all([
    this.prisma.ride.count({
      where: { userId, status: "CONFIRMED" },
    }),
    this.prisma.streetReport.count({
      where: { userId },
    }),
    this.prisma.$queryRaw<{ total_km: number }[]>`
      SELECT
        COALESCE(SUM(ST_Length("routeGeometry")), 0) / 1000.0 AS total_km
      FROM "Ride"
      WHERE
        "userId" = ${userId}
        AND status = 'CONFIRMED'
    `,
  ]);
  console.log("📏 totalDistanceKm", Number(distanceRow[0]?.total_km ?? 0));


  return {
    ridesCount,
    reportsCount,
    totalDistanceKm: Number(distanceRow[0]?.total_km ?? 0),
  };
}

}
