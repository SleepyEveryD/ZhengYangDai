import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./components/Login";

import MapExplorer from "./components/MapExplorer";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/map" element={<MapExplorer />} />
      </Routes>
    </BrowserRouter>
  );
}
