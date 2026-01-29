import { useEffect } from "react";
import api from "../lib/api";
import { RIDE_QUEUE_UPDATED } from "../constants/events";

const STORAGE_KEY = "current_ride";

export function useRideUploader() {
  useEffect(() => {
    let uploading = false;

    const upload = async () => {
      if (uploading) return; // ✅ 防并发
      uploading = true;

      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          console.log("📭 no ride in localStorage");
          return;
        }

        const ride = JSON.parse(raw);

        if (ride.uploadStatus !== "pending") {
          console.log("⏭️ skip upload, uploadStatus:", ride.uploadStatus);
          return;
        }

        const { uploadStatus, ...payload } = ride;

        if (payload.status === "DRAFT") {
          console.log("⬆️ saving ride", payload.id);
          console.log("⬆️ playlod", payload.issues);
   
          await api.put(`/rides/${payload.id}/save`, payload);
        } else {
          console.log("⬆️ confirming ride", payload.id);
          await api.post(`/rides/${payload.id}/confirm`, payload);
        }

        // ✅ 2️⃣ 标记为 uploaded
        const updatedRide = {
          ...ride,
          uploadStatus: "uploaded",
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRide));

        console.log("✅ upload success, marked as uploaded");
      } catch (e) {
        console.error("❌ upload failed", e);
      } finally {
        uploading = false;
      }
    };

    // ⭐ 关键 1：监听 Confirm 触发的事件
    window.addEventListener(RIDE_QUEUE_UPDATED, upload);

    // ⭐ 关键 2：页面首次加载也跑一次（兜底）
    upload();

    return () => {
      window.removeEventListener(RIDE_QUEUE_UPDATED, upload);
    };
  }, []);
}
