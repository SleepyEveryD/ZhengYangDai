//Project/backend/src/rides/dto/save-ride-segments.dto.ts
export type RoadCondition =
  | 'EXCELLENT'
  | 'GOOD'
  | 'FAIR'
  | 'NEED_REPAIR';

export type IssueType =
  | 'NONE'
  | 'POTHOLE'
  | 'BUMP'
  | 'GRAVEL'
  | 'CONSTRUCTION'
  | 'OTHER';

export class SaveRideSegmentsDto {
  segments: {
    orderIndex: number;
    geometry: any; // GeoJSON LineString
    lengthM: number;
    report: {
      roadCondition: RoadCondition;
      issueType?: IssueType;
      notes?: string;
    };
  }[];
}
