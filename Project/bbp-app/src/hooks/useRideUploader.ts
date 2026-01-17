//Project/bbp-app/src/hooks/useRideUploader.ts
import { useEffect } from 'react';
import { getPendingRides } from '../services/rideStorage';
import api from "../lib/api"; 


export function useRideUploader() {
  useEffect(() => {
    console.log('🔥 useRideUploader mounted');
    const upload = async () => {
      const rides = getPendingRides();
      console.log('📦 pending rides:', rides);

      for (const ride of rides) {
        try {
          // 1️⃣ 保存 Draft Segments
          await api.put(`/rides/${ride.id}/segments`, {
            segments: ride.roadConditionSegments,
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
      }
    };

    upload();
  }, []);
}

