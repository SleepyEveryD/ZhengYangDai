//Project/bbp-app/src/hooks/useRideUploader.ts
import { useEffect } from 'react';
import { getCurrentRide } from '../services/rideStorage';
import api from "../lib/api"; 


export function useRideUploader() {
  useEffect(() => {
    function mapCondition(
      c: 'excellent' | 'good' | 'fair' | 'poor'
    ): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'NEED_REPAIR' {
      switch (c) {
        case 'excellent': return 'EXCELLENT';
        case 'good': return 'GOOD';
        case 'fair': return 'FAIR';
        default: return 'NEED_REPAIR';
      }
    }
    

    const upload = async () => {
      const ride = getCurrentRide();
      console.log('📦 pending rides:', ride);
   
      try {
        console.log('Uploading ride', ride.id, {
          roadConditionSegments: ride.roadConditionSegments,
        });
        // 1️⃣ 保存 Draft Segments
        await api.put(`/rides/${ride.id}`, {
          segments: ride.roadConditionSegments.map((seg, index) => ({
            orderIndex: index,
        
            geometry: {
              type: "LineString",
              coordinates: seg.pathCoordinates.map(
                ([lat, lng]) => [lng, lat] // GeoJSON 必须 lng,lat
              ),
            },
        
            lengthM: seg.pathCoordinates.length * 50, // 你现在的 approx 逻辑
        
            report: {
              roadCondition: mapCondition(seg.condition),
              issueType: "NONE",
            },
          })),
        });
        

        // 2️⃣ Confirm Ride
        await api.post(`/rides/${ride.id}/confirm`, {
          publish: ride.publish === true,
        });

        // 3️⃣ 标记 uploaded
        markRideUploaded(ride.id);

        console.log('Uploaded ride', ride.id);
      } catch (e) {
        console.error('Upload failed', ride.id, e);
      }
      
    };

    upload();
  }, []);
}

