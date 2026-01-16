-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('RECORDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'PUBLISHABLE');

-- CreateEnum
CREATE TYPE "ConditionLevel" AS ENUM ('OPTIMAL', 'MEDIUM', 'SUFFICIENT', 'MAINTENANCE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "supabaseUid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "TripStatus" NOT NULL DEFAULT 'RECORDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stoppedAt" TIMESTAMP(3),
    "distance" DOUBLE PRECISION,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PathSegment" (
    "id" TEXT NOT NULL,
    "streetName" TEXT NOT NULL,
    "geometry" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PathSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PathReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "anonId" TEXT,
    "segmentId" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "condition" "ConditionLevel" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "minLng" DOUBLE PRECISION,
    "minLat" DOUBLE PRECISION,
    "maxLng" DOUBLE PRECISION,
    "maxLat" DOUBLE PRECISION,

    CONSTRAINT "PathReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MergedSegment" (
    "id" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "mergedCondition" "ConditionLevel" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reportCount" INTEGER NOT NULL,
    "latestReportAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MergedSegment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_supabaseUid_key" ON "User"("supabaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Trip_userId_idx" ON "Trip"("userId");

-- CreateIndex
CREATE INDEX "Trip_status_idx" ON "Trip"("status");

-- CreateIndex
CREATE INDEX "PathReport_userId_idx" ON "PathReport"("userId");

-- CreateIndex
CREATE INDEX "PathReport_anonId_idx" ON "PathReport"("anonId");

-- CreateIndex
CREATE INDEX "PathReport_segmentId_status_createdAt_idx" ON "PathReport"("segmentId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MergedSegment_segmentId_key" ON "MergedSegment"("segmentId");

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathReport" ADD CONSTRAINT "PathReport_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "PathSegment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathReport" ADD CONSTRAINT "PathReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MergedSegment" ADD CONSTRAINT "MergedSegment_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "PathSegment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
