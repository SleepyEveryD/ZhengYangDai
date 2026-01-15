import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./routes";
import { useRideUploader } from "./hooks/useRideUploader";

function AppInner() {
  useRideUploader(); 
  return <AppRoutes />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}
