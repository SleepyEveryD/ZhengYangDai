import { RoadCondition } from '@prisma/client';

export type SubmitStreetReportItemDto = {
  streetExternalId: string;
  roadCondition: RoadCondition; // EXCELLENT/GOOD/FAIR/NEED_REPAIR
  notes?: string | null;
};

export type SubmitReportsDto = {
  userId: string;
  rideId: string;
  startedAt?: string;
  endedAt?: string;
  reports: SubmitStreetReportItemDto[];
};
