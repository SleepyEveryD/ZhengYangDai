import MapExplorer from "../components/MapExplorer";
import { useAuth } from "../auth/AuthContext";
import { useRideUploader } from "../hooks/useRideUploader"; 


export default function MapPage() {
  const { user, loading } = useAuth();
  useRideUploader();
  if (loading) return null; // 或 loading UI
  return <MapExplorer user={user} />;
}
