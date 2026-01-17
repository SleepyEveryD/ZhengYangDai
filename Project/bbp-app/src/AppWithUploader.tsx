// src/AppWithUploader.tsx
import { useRideUploader } from "./hooks/useRideUploader";

export function AppWithUploader() {
  console.log("🔥 AppWithUploader render");

  useRideUploader();

  return <div>TEST APP WITH UPLOADER</div>;
}
