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
    "routeGeoJson" JSONB,
    "routeGeometry" geography(LineString, 4326),
    "status" "RideStatus" NOT NULL DEFAULT 'DRAFT',
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Street" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT,
    "city" TEXT,
    "country" TEXT,
    "geometry" geography(LineString, 4326),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Street_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RideStreet" (
    "rideId" TEXT NOT NULL,
    "streetId" TEXT NOT NULL,
    "coverage" DOUBLE PRECISION,

    CONSTRAINT "RideStreet_pkey" PRIMARY KEY ("rideId","streetId")
);

-- CreateTable
CREATE TABLE "StreetReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "streetId" TEXT NOT NULL,
    "roadCondition" "RoadCondition" NOT NULL,
    "issueType" "IssueType" NOT NULL DEFAULT 'NONE',
    "notes" TEXT,
    "rideId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreetReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreetIssue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "streetId" TEXT NOT NULL,
    "issueType" "IssueType" NOT NULL,
    "location" geography(Point, 4326) NOT NULL,
    "severity" INTEGER,
    "notes" TEXT,
    "rideId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreetIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreetAggregation" (
    "streetId" TEXT NOT NULL,
    "finalCondition" "RoadCondition" NOT NULL,
    "agreementScore" DOUBLE PRECISION NOT NULL,
    "issueSummary" JSONB,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StreetAggregation_pkey" PRIMARY KEY ("streetId")
);

-- CreateIndex
CREATE INDEX "Ride_userId_idx" ON "Ride"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Street_externalId_key" ON "Street"("externalId");

-- CreateIndex
CREATE INDEX "Street_externalId_idx" ON "Street"("externalId");

-- CreateIndex
CREATE INDEX "Street_name_idx" ON "Street"("name");

-- CreateIndex
CREATE INDEX "Street_city_name_idx" ON "Street"("city", "name");

-- CreateIndex
CREATE INDEX "RideStreet_streetId_idx" ON "RideStreet"("streetId");

-- CreateIndex
CREATE INDEX "StreetReport_streetId_idx" ON "StreetReport"("streetId");

-- CreateIndex
CREATE INDEX "StreetReport_userId_idx" ON "StreetReport"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StreetReport_userId_streetId_key" ON "StreetReport"("userId", "streetId");

-- CreateIndex
CREATE INDEX "StreetIssue_streetId_idx" ON "StreetIssue"("streetId");

-- CreateIndex
CREATE INDEX "StreetIssue_issueType_idx" ON "StreetIssue"("issueType");

-- CreateIndex
CREATE INDEX "StreetIssue_userId_idx" ON "StreetIssue"("userId");

-- AddForeignKey
ALTER TABLE "RideStreet" ADD CONSTRAINT "RideStreet_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideStreet" ADD CONSTRAINT "RideStreet_streetId_fkey" FOREIGN KEY ("streetId") REFERENCES "Street"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreetReport" ADD CONSTRAINT "StreetReport_streetId_fkey" FOREIGN KEY ("streetId") REFERENCES "Street"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreetIssue" ADD CONSTRAINT "StreetIssue_streetId_fkey" FOREIGN KEY ("streetId") REFERENCES "Street"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreetAggregation" ADD CONSTRAINT "StreetAggregation_streetId_fkey" FOREIGN KEY ("streetId") REFERENCES "Street"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ========================================
-- TRIGGERS FOR AUTO-GENERATING GEOMETRIES
-- ========================================

-- Function: Auto-update Ride.routeGeometry from routeGeoJson
CREATE OR REPLACE FUNCTION update_ride_geometry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."routeGeoJson" IS NOT NULL THEN
    BEGIN
      NEW."routeGeometry" = ST_GeomFromGeoJSON(NEW."routeGeoJson"::text)::geography;
    EXCEPTION WHEN OTHERS THEN
      NEW."routeGeometry" = NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Apply function on Ride INSERT/UPDATE
CREATE TRIGGER ride_geometry_trigger
  BEFORE INSERT OR UPDATE ON "Ride"
  FOR EACH ROW
  EXECUTE FUNCTION update_ride_geometry();

-- ========================================
-- INDEXES FOR GEOGRAPHY COLUMNS (OPTIONAL)
-- ========================================

-- Spatial index on Ride.routeGeometry
CREATE INDEX IF NOT EXISTS "Ride_routeGeometry_idx" 
  ON "Ride" USING GIST ("routeGeometry");

-- Spatial index on Street.geometry
CREATE INDEX IF NOT EXISTS "Street_geometry_idx" 
  ON "Street" USING GIST ("geometry");

-- Spatial index on StreetIssue.location
CREATE INDEX IF NOT EXISTS "StreetIssue_location_idx" 
  ON "StreetIssue" USING GIST ("location");