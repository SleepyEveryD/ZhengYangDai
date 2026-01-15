import { useEffect } from 'react';
import { getPendingRides } from '../services/rideStorage';

export function useRideUploader() {
  useEffect(() => {
    const upload = async () => {
      const rides = getPendingRides();

      for (const ride of rides) {
        try {
          // await api.uploadRide(ride)
          console.log('Uploading ride', ride.id);
          // 成功后标记 uploaded（你后面可补）
        } catch (e) {
          console.error('Upload failed', ride.id);
        }
      }
    };

    upload();
  }, []);
}
