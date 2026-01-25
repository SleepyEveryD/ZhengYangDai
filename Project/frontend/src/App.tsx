// App.tsx
import { BrowserRouter } from "react-router-dom";
import { AppWithUploader } from "./AppWithUploader";

export default function App() {
  return (
    <BrowserRouter>
      <AppWithUploader />
    </BrowserRouter>
  );
}
