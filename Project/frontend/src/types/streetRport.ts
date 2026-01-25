import type { RouteCondition } from "./route";
import type { IssueType } from "./issue";

export type StreetReport = {
    id: string;
    userId: string;
    streetId: string;
  
    roadCondition: RouteCondition;
    issueType: IssueType;
  
    notes?: string;
    rideId?: string;
  
    createdAt: Date;
  };
  