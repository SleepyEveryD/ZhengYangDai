import { Injectable } from "@nestjs/common"
import { PrismaService } from "../prisma/prisma.service"

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfileSummary(userId: string) {
    const [ridesCount, reportsCount] = await Promise.all([
      this.prisma.ride.count({
        where: { userId },
      }),
      this.prisma.streetReport.count({
        where: { userId },
      }),
    ])

    return {
      ridesCount,
      reportsCount,
    }
  }
}
