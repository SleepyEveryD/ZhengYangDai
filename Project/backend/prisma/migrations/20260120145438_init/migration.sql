-- CreateEnum
CREATE TYPE "RideStatus" AS ENUM ('DRAFT', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "RoadCondition" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'NEED_REPAIR');

-- CreateEnum
CREATE TYPE "IssueType" AS ENUM ('NONE', 'POTHOLE', 'TRAFFIC', 'OTHER');

-- CreateTable
CREATE TABLE "Ride" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "RideStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RideSegment" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "geometry" JSONB NOT NULL,
    "lengthM" INTEGER NOT NULL,

    CONSTRAINT "RideSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RideSegmentReport" (
    "id" TEXT NOT NULL,
    "rideSegmentId" TEXT NOT NULL,
    "roadCondition" "RoadCondition" NOT NULL,
    "issueType" "IssueType" NOT NULL,
    "notes" TEXT,

    CONSTRAINT "RideSegmentReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RideSegmentReport_rideSegmentId_key" ON "RideSegmentReport"("rideSegmentId");

-- AddForeignKey
ALTER TABLE "RideSegment" ADD CONSTRAINT "RideSegment_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideSegmentReport" ADD CONSTRAINT "RideSegmentReport_rideSegmentId_fkey" FOREIGN KEY ("rideSegmentId") REFERENCES "RideSegment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
