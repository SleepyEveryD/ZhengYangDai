import MapExplorer from "../components/MapExplorer";
import { useAuth } from "../auth/AuthContext";


export default function MapPage() {
  const { user, loading } = useAuth();
  console.log("🧭 MapPage useAuth:", user);

  if (loading) return null; // 或 loading UI


  return <MapExplorer user={user} />;
}
