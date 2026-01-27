import { useEffect } from 'react';
import api from '../lib/api';

const STORAGE_KEY = 'current_ride';

export function useRideUploader() {
  useEffect(() => {
    const upload = async () => {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        console.log('📭 no ride in localStorage');
        return;
      }

      const ride = JSON.parse(raw);

      // ✅ 1️⃣ 只处理 pending
      if (ride.uploadStatus !== 'pending') {
        console.log('⏭️ skip upload, uploadStatus:', ride.uploadStatus);
        return;
      }

      // ✅ 2️⃣ 构造 confirm payload（必须包含 status）
      const { uploadStatus, ...payload } = ride;

     

      try {
        if (payload.status == 'DRAFT') {
          console.log('⬆️ Saving ride', payload.id);
          await api.put(`/rides/${payload.id}/save`, payload);

        }else{
          console.log('⬆️ confirming ride', payload.id);
          await api.post(`/rides/${payload.id}/confirm`, payload);
        }
        // ✅ 4️⃣ 标记已上传
        const updatedRide = {
          ...ride,
          uploadStatus: 'uploaded',
        };

        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(updatedRide)
        );

        console.log('✅ upload success, marked as uploaded');
      } catch (e) {
        console.error('❌ upload failed', e);
      }
    };

    upload();
  }, []);
}
