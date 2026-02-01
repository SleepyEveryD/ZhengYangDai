import { useEffect } from "react";
import api from "../lib/api";
import { RIDE_QUEUE_UPDATED } from "../constants/events";

const STORAGE_KEY = "current_ride";

export function useRideUploader() {
  useEffect(() => {
    let uploading = false;

    const upload = async () => {
      if (uploading) return; // avoid concurrent uploads
      uploading = true;

      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          //console.log("📭 no ride in localStorage");
          return;
        }

        const ride = JSON.parse(raw);

        if (ride.uploadStatus !== "pending") {
          //console.log("⏭️ skip upload, uploadStatus:", ride.uploadStatus);
          return;
        }

        const { uploadStatus, ...payload } = ride;

        if (payload.status === "DRAFT") {
  
          await api.put(`/api/rides/${payload.id}/save`, payload);
        } else {
          //console.log("⬆️ confirming ride", payload.id);
          await api.post(`/api/rides/${payload.id}/confirm`, payload);
        }

        // mark as uploaded
        const updatedRide = {
          ...ride,
          uploadStatus: "uploaded",
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRide));

        //console.log("✅ upload success, marked as uploaded");
      } catch (e) {
        //console.error("❌ upload failed", e);
      } finally {
        uploading = false;
      }
    };

    // listen for ride queue update events
    window.addEventListener(RIDE_QUEUE_UPDATED, upload);

    // on mount, try
    upload();

    return () => {
      window.removeEventListener(RIDE_QUEUE_UPDATED, upload);
    };
  }, []);
}
