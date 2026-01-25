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
      // ✅ 1️⃣ 只处理 pending 的 ride
      if (ride.uploadStatus !== 'pending') {
        console.log('⏭️ skip upload, uploadStatus:', ride.uploadStatus);
        return;
      }

      // ✅ 2️⃣ 构造后端 payload（显式排除 uploadStatus）
      const { uploadStatus, ...ridePayload } = ride;

      try {
        console.log('⬆️ uploading full ride payload', ride.id);

        // 3️⃣ 上传完整 ride（除了 uploadStatus）
        await api.put(`/rides/${ride.id}`, ridePayload);

        // 4️⃣ confirm（如果你的后端需要单独 confirm）
        await api.post(`/rides/${ride.id}/confirm`, {
          publish: ride.publish === true,
        });

        // ✅ 5️⃣ 上传成功 → 更新 localStorage 中的 uploadStatus
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
