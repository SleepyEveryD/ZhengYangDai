import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./routes";
import { useRideUploader } from "./hooks/useRideUploader";

export default function App() {
  useRideUploader();

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
