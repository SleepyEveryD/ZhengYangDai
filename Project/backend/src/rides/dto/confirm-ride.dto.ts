// confirm-ride.dto.ts
export class ConfirmRideDto {
    segments: RideSegmentDto[];
  }
  
  export class RideSegmentDto {
    orderIndex: number;
  
    geometry: GeoJSON.LineString;
  
    lengthM: number;
  
    report: {
      roadCondition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'NEED_REPAIR';
      notes?: string;
    };
  }
  