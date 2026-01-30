//Project/bbp-app/src/main.tsx
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/globals.css";
import { AuthProvider } from "./auth/AuthProvider"; 
import { initAuthListener } from "./auth/initAuthListener";

initAuthListener();

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
