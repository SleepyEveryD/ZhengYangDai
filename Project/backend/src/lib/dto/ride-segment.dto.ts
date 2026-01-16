// src/lib/dto/ride-segment.dto.ts
import { z } from "zod";

export const SegmentReportSchema = z.object({
  roadCondition: z.enum([
    "EXCELLENT",
    "GOOD",
    "FAIR",
    "NEED_REPAIR",
  ]),
  issueType: z.enum([
    "NONE",
    "POTHOLE",
    "BUMP",
    "GRAVEL",
    "CONSTRUCTION",
    "OTHER",
  ]).optional(),
  notes: z.string().optional(),
});

export const RideSegmentSchema = z.object({
  orderIndex: z.number().int().nonnegative(),
  geometry: z.any(), // GeoJSON，后端不解析
  lengthM: z.number().positive(),
  report: SegmentReportSchema,
});

export const SaveRideSegmentsBodySchema = z.object({
  segments: z.array(RideSegmentSchema),
});

export type SaveRideSegmentsBody = z.infer<
  typeof SaveRideSegmentsBodySchema
>;
