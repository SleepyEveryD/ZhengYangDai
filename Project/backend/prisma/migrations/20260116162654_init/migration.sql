-- CreateEnum
CREATE TYPE "RideStatus" AS ENUM ('DRAFT', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "RoadCondition" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'NEED_REPAIR');

-- CreateEnum
CREATE TYPE "IssueType" AS ENUM ('NONE', 'POTHOLE', 'BUMP', 'GRAVEL', 'CONSTRUCTION', 'OTHER');

-- CreateTable
CREATE TABLE "Ride" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "routeGeometry" geography(LineString, 4326) NOT NULL,
    "totalDistanceM" DOUBLE PRECISION NOT NULL,
    "totalDurationS" INTEGER NOT NULL,
    "avgSpeedKmh" DOUBLE PRECISION NOT NULL,
    "maxSpeedKmh" DOUBLE PRECISION NOT NULL,
    "status" "RideStatus" NOT NULL DEFAULT 'DRAFT',
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RideSegment" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "geometry" geography(LineString, 4326) NOT NULL,
    "lengthM" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RideSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RideSegmentReport" (
    "id" TEXT NOT NULL,
    "rideSegmentId" TEXT NOT NULL,
    "roadCondition" "RoadCondition" NOT NULL,
    "issueType" "IssueType" NOT NULL DEFAULT 'NONE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RideSegmentReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PathSegment" (
    "id" TEXT NOT NULL,
    "geometry" geography(LineString, 4326) NOT NULL,
    "lengthM" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PathSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AggregatedSegment" (
    "segmentId" TEXT NOT NULL,
    "finalCondition" "RoadCondition" NOT NULL,
    "agreementScore" DOUBLE PRECISION NOT NULL,
    "obstacleSummary" JSONB,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AggregatedSegment_pkey" PRIMARY KEY ("segmentId")
);

-- CreateIndex
CREATE INDEX "Ride_userId_idx" ON "Ride"("userId");

-- CreateIndex
CREATE INDEX "RideSegment_rideId_idx" ON "RideSegment"("rideId");

-- CreateIndex
CREATE UNIQUE INDEX "RideSegment_rideId_orderIndex_key" ON "RideSegment"("rideId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "RideSegmentReport_rideSegmentId_key" ON "RideSegmentReport"("rideSegmentId");

-- AddForeignKey
ALTER TABLE "RideSegment" ADD CONSTRAINT "RideSegment_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideSegmentReport" ADD CONSTRAINT "RideSegmentReport_rideSegmentId_fkey" FOREIGN KEY ("rideSegmentId") REFERENCES "RideSegment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AggregatedSegment" ADD CONSTRAINT "AggregatedSegment_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "PathSegment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
