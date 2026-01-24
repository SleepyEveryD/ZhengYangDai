export type StreetReport = {
    id: string;
    userId: string;
    streetId: string;
  
    roadCondition: RoadCondition;
    issueType: IssueType;
  
    notes?: string;
    rideId?: string;
  
    createdAt: Date;
  };
  