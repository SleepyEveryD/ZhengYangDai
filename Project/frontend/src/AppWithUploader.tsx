// src/AppWithUploader.tsx
import { AppRoutes } from "./routes";
import { useRideUploader } from "./hooks/useRideUploader";


export function AppWithUploader() {
  console.log("🔥 AppWithUploader render");

  useRideUploader(); 

  return <AppRoutes />; 
}
