CREATE EXTENSION IF NOT EXISTS postgis;

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
    "geometryJson" JSONB,
    "geometry" geography(LineString, 4326),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Street_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreetIssue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "issueType" "IssueType" NOT NULL,
    "locationJson" JSONB,
    "location" geography(Point, 4326),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreetIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreetReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "streetId" TEXT NOT NULL,
    "roadCondition" "RoadCondition" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreetReport_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "Street_name_idx" ON "Street"("name");

-- CreateIndex
CREATE INDEX "Street_city_name_idx" ON "Street"("city", "name");

-- CreateIndex
CREATE INDEX "StreetIssue_rideId_idx" ON "StreetIssue"("rideId");

-- CreateIndex
CREATE INDEX "StreetIssue_userId_idx" ON "StreetIssue"("userId");

-- CreateIndex
CREATE INDEX "StreetIssue_issueType_idx" ON "StreetIssue"("issueType");

-- CreateIndex
CREATE INDEX "StreetReport_streetId_idx" ON "StreetReport"("streetId");

-- CreateIndex
CREATE INDEX "StreetReport_rideId_idx" ON "StreetReport"("rideId");

-- CreateIndex
CREATE INDEX "StreetReport_userId_idx" ON "StreetReport"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StreetReport_userId_rideId_streetId_key" ON "StreetReport"("userId", "rideId", "streetId");

-- AddForeignKey
ALTER TABLE "StreetIssue" ADD CONSTRAINT "StreetIssue_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreetReport" ADD CONSTRAINT "StreetReport_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreetReport" ADD CONSTRAINT "StreetReport_streetId_fkey" FOREIGN KEY ("streetId") REFERENCES "Street"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreetAggregation" ADD CONSTRAINT "StreetAggregation_streetId_fkey" FOREIGN KEY ("streetId") REFERENCES "Street"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE OR REPLACE FUNCTION calculate_street_aggregation(street_id_param TEXT)
RETURNS void AS $$
DECLARE
  report_count INT;
  condition_mode "RoadCondition";
BEGIN
  SELECT COUNT(*) INTO report_count
  FROM "StreetReport"
  WHERE "streetId" = street_id_param;

  IF report_count = 0 THEN
    DELETE FROM "StreetAggregation" WHERE "streetId" = street_id_param;
    RETURN;
  END IF;

  SELECT "roadCondition"
  INTO condition_mode
  FROM "StreetReport"
  WHERE "streetId" = street_id_param
  GROUP BY "roadCondition"
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  INSERT INTO "StreetAggregation" (
    "streetId",
    "finalCondition",
    "agreementScore",
    "lastUpdatedAt"
  )
  VALUES (
    street_id_param,
    condition_mode,
    1.0,
    NOW()
  )
  ON CONFLICT ("streetId") DO UPDATE SET
    "finalCondition" = EXCLUDED."finalCondition",
    "lastUpdatedAt" = NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_update_street_aggregation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM calculate_street_aggregation(OLD."streetId");
    RETURN OLD;
  END IF;

  PERFORM calculate_street_aggregation(NEW."streetId");
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER street_report_aggregation_trigger
AFTER INSERT OR UPDATE OR DELETE ON "StreetReport"
FOR EACH ROW
EXECUTE FUNCTION trigger_update_street_aggregation();
