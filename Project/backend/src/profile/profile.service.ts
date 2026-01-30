import { Injectable } from "@nestjs/common"
import { PrismaService } from "../prisma/prisma.service"

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

 async getProfileSummary(userId: string) {
  
  const [ridesCount, confirmedRidesCount, distanceRow] = await Promise.all([
    this.prisma.ride.count({
      where: { userId },
    }),
    this.prisma.ride.count({
      where: { userId, status: "CONFIRMED" },
    }),
    this.prisma.$queryRaw<{ total_km: number }[]>`
      SELECT
        COALESCE(SUM(ST_Length("routeGeometry")), 0) / 1000.0 AS total_km
      FROM "Ride"
      WHERE
        "userId" = ${userId}
        
    `,
  ]);
  //console.log("📏 ridesCount", ridesCount);

  //console.log("📏 confirmedRidesCount", confirmedRidesCount);

  console.log("📏 totalDistanceKm", Number(distanceRow[0]?.total_km ?? 0));


  return {
    ridesCount,
    confirmedRidesCount,
    totalDistanceKm: Number(distanceRow[0]?.total_km ?? 0),
  };
}

}
