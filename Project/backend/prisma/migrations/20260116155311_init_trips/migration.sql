/*
  Warnings:

  - You are about to drop the `MergedSegment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PathReport` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PathSegment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Trip` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "issue_severity" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "issue_status" AS ENUM ('pending', 'confirmed', 'fixed');

-- CreateEnum
CREATE TYPE "issue_type" AS ENUM ('pothole', 'crack', 'obstacle', 'other');

-- CreateEnum
CREATE TYPE "report_source" AS ENUM ('manual', 'automatic');

-- CreateEnum
CREATE TYPE "report_status" AS ENUM ('draft', 'confirmed', 'publishable');

-- CreateEnum
CREATE TYPE "trip_status" AS ENUM ('recording', 'completed');

-- DropForeignKey
ALTER TABLE "MergedSegment" DROP CONSTRAINT "MergedSegment_segmentId_fkey";

-- DropForeignKey
ALTER TABLE "PathReport" DROP CONSTRAINT "PathReport_segmentId_fkey";

-- DropForeignKey
ALTER TABLE "PathReport" DROP CONSTRAINT "PathReport_userId_fkey";

-- DropForeignKey
ALTER TABLE "Trip" DROP CONSTRAINT "Trip_userId_fkey";

-- DropTable
DROP TABLE "MergedSegment";

-- DropTable
DROP TABLE "PathReport";

-- DropTable
DROP TABLE "PathSegment";

-- DropTable
DROP TABLE "Trip";

-- DropTable
DROP TABLE "User";

-- DropEnum
DROP TYPE "ConditionLevel";

-- DropEnum
DROP TYPE "ReportStatus";

-- DropEnum
DROP TYPE "TripStatus";

-- CreateTable
CREATE TABLE "aggregated_segments" (
    "segment_id" UUID NOT NULL,
    "avg_condition" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "last_updated" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aggregated_segments_pkey" PRIMARY KEY ("segment_id")
);

-- CreateTable
CREATE TABLE "issues" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "trip_id" UUID,
    "type" "issue_type" NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "severity" "issue_severity" NOT NULL,
    "status" "issue_status" NOT NULL DEFAULT 'pending',
    "description" TEXT,
    "auto_detected" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "path_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "segment_id" UUID,
    "condition" INTEGER,
    "notes" TEXT,
    "source" "report_source" NOT NULL,
    "status" "report_status" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "path_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "path_scores" (
    "path_id" UUID NOT NULL,
    "quality_score" DOUBLE PRECISION,
    "efficiency_score" DOUBLE PRECISION,
    "final_score" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "computed_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "path_scores_pkey" PRIMARY KEY ("path_id")
);

-- CreateTable
CREATE TABLE "path_segment_map" (
    "path_id" UUID NOT NULL,
    "segment_id" UUID NOT NULL,
    "order_index" INTEGER NOT NULL,

    CONSTRAINT "path_segment_map_pkey" PRIMARY KEY ("path_id","segment_id")
);

-- CreateTable
CREATE TABLE "path_segments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "start_lat" DOUBLE PRECISION NOT NULL,
    "start_lng" DOUBLE PRECISION NOT NULL,
    "end_lat" DOUBLE PRECISION NOT NULL,
    "end_lng" DOUBLE PRECISION NOT NULL,
    "geometry" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "path_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paths" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "total_length" DOUBLE PRECISION,
    "name" TEXT,

    CONSTRAINT "paths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "path_id" UUID,
    "user_id" UUID,
    "content" TEXT NOT NULL,
    "rating" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "route_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_gps_points" (
    "id" BIGSERIAL NOT NULL,
    "trip_id" UUID,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "recorded_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "trip_gps_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_points" (
    "id" BIGSERIAL NOT NULL,
    "trip_id" UUID NOT NULL,
    "latitude" DECIMAL NOT NULL,
    "longitude" DECIMAL NOT NULL,
    "recorded_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "trip_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_weather" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "trip_id" UUID,
    "temperature" DOUBLE PRECISION,
    "condition" TEXT,
    "retrieved_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_weather_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "start_time" TIMESTAMPTZ(6) NOT NULL,
    "end_time" TIMESTAMPTZ(6),
    "distance_km" DECIMAL,
    "duration_seconds" INTEGER,
    "average_speed" DECIMAL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "max_speed" DOUBLE PRECISION,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "avatar" TEXT,
    "total_distance" DOUBLE PRECISION DEFAULT 0,
    "total_rides" INTEGER DEFAULT 0,
    "total_reports" INTEGER DEFAULT 0,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_report_segment" ON "path_reports"("segment_id");

-- CreateIndex
CREATE INDEX "idx_report_status" ON "path_reports"("status");

-- CreateIndex
CREATE INDEX "idx_gps_trip" ON "trip_gps_points"("trip_id");

-- CreateIndex
CREATE INDEX "idx_trips_user" ON "trips"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "aggregated_segments" ADD CONSTRAINT "aggregated_segments_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "path_segments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "path_reports" ADD CONSTRAINT "path_reports_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "path_segments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "path_reports" ADD CONSTRAINT "path_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "path_scores" ADD CONSTRAINT "path_scores_path_id_fkey" FOREIGN KEY ("path_id") REFERENCES "paths"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "path_segment_map" ADD CONSTRAINT "path_segment_map_path_id_fkey" FOREIGN KEY ("path_id") REFERENCES "paths"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "path_segment_map" ADD CONSTRAINT "path_segment_map_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "path_segments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "route_comments" ADD CONSTRAINT "route_comments_path_id_fkey" FOREIGN KEY ("path_id") REFERENCES "paths"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "route_comments" ADD CONSTRAINT "route_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "trip_gps_points" ADD CONSTRAINT "trip_gps_points_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "trip_points" ADD CONSTRAINT "trip_points_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "trip_weather" ADD CONSTRAINT "trip_weather_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
