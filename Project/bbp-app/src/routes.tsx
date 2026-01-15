import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./components/Login";
import MapExplorer from "./components/MapExplorer";
import MapPage from "./components/MapPage"
import PathPlanning from "./components/PathPlanning";
import PathResults from "./components/PathResults";
import PathDetail from "./components/PathDetail";
import RideRecordPrepare from "./components/RideRecordPrepare";
import RideRecording from "./components/RideRecording";
import RideRecordConfirm from "./components/RideRecordConfirm";
import Profile from "./components/Profile";
import RideHistory from "./components/RideHistory";
import RideDetail from "./components/RideDetail";
import ReportHistory from "./components/ReportHistory";

export function AppRoutes() {
  return (
    <Routes>
      {/* 默认入口 */}
      <Route path="/" element={<Navigate to="/login" />} />

      <Route path="/login" element={<Login />} />
      <Route path="/map" element={<MapPage />} />

      <Route path="/path/planning" element={<PathPlanning />} />
      <Route path="/path/results" element={<PathResults />} />
      <Route path="/path/:id" element={<PathDetail />} />

      <Route path="/ride/prepare" element={<RideRecordPrepare />} />
      <Route path="/ride/recording" element={<RideRecording />} />
      <Route path="/ride/confirm" element={<RideRecordConfirm />} />

      <Route path="/profile" element={<Profile />} />

      <Route path="/rides" element={<RideHistory />} />
      <Route path="/rides/:id" element={<RideDetail />} />

      <Route path="/reports" element={<ReportHistory />} />
    </Routes>
  );
}
