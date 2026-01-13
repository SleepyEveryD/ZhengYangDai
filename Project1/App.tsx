import React, { useState, useEffect } from 'react';
import MapExplorer from './components/MapExplorer';
import Login from './components/Login';
import PathPlanning from './components/PathPlanning';
import PathResults from './components/PathResults';
import PathDetail from './components/PathDetail';
import RideRecordPrepare from './components/RideRecordPrepare';
import RideRecording from './components/RideRecording';
import RideRecordConfirm from './components/RideRecordConfirm';
import Profile from './components/Profile';
import RideHistory from './components/RideHistory';
import RideDetail from './components/RideDetail';
import ReportHistory from './components/ReportHistory';
import { Toaster } from './components/ui/sonner';

export type User = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  totalDistance: number;
  totalRides: number;
  totalReports: number;
} | null;

export type Route = {
  id: string;
  name: string;
  distance: number;
  duration: number;
  rating: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  path: [number, number][];
  elevation: number[];
  segments: {
    condition: 'excellent' | 'good' | 'fair' | 'poor';
    distance: number;
    description: string;
  }[];
  comments: {
    user: string;
    date: string;
    content: string;
    rating: number;
  }[];
};

export type Ride = {
  id: string;
  date: string;
  distance: number;
  duration: number;
  avgSpeed: number;
  maxSpeed: number;
  path: [number, number][];
  issues: Issue[];
};

export type Issue = {
  id: string;
  type: 'pothole' | 'crack' | 'obstacle' | 'other';
  location: [number, number];
  severity: 'low' | 'medium' | 'high';
  status: 'pending' | 'confirmed' | 'fixed';
  date: string;
  description?: string;
  autoDetected?: boolean;
};

export type Page =
  | 'login'
  | 'map'
  | 'pathPlanning'
  | 'pathResults'
  | 'pathDetail'
  | 'rideRecordPrepare'
  | 'rideRecording'
  | 'rideRecordConfirm'
  | 'profile'
  | 'rideHistory'
  | 'rideDetail'
  | 'reportHistory';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('login');
  const [user, setUser] = useState<User>(null);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [currentRide, setCurrentRide] = useState<Ride | null>(null);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);

  const handleLogin = (userData: User) => {
    setUser(userData);
    setCurrentPage('map');
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentPage('login');
  };

  const navigateTo = (page: Page, data?: any) => {
    if (page === 'pathDetail' && data) {
      setSelectedRoute(data);
    }
    if (page === 'rideRecordConfirm' && data) {
      setCurrentRide(data);
    }
    if (page === 'rideDetail' && data) {
      setSelectedRide(data);
    }
    setCurrentPage(page);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'login':
        return <Login onLogin={handleLogin} />;
      case 'map':
        return <MapExplorer user={user} navigateTo={navigateTo} />;
      case 'pathPlanning':
        return <PathPlanning navigateTo={navigateTo} user={user} />;
      case 'pathResults':
        return <PathResults navigateTo={navigateTo} user={user} />;
      case 'pathDetail':
        return <PathDetail route={selectedRoute} navigateTo={navigateTo} user={user} />;
      case 'rideRecordPrepare':
        return <RideRecordPrepare navigateTo={navigateTo} />;
      case 'rideRecording':
        return <RideRecording navigateTo={navigateTo} />;
      case 'rideRecordConfirm':
        return <RideRecordConfirm ride={currentRide} navigateTo={navigateTo} user={user} setUser={setUser} />;
      case 'profile':
        return <Profile user={user} navigateTo={navigateTo} onLogout={handleLogout} />;
      case 'rideHistory':
        return <RideHistory navigateTo={navigateTo} />;
      case 'rideDetail':
        return <RideDetail ride={selectedRide} navigateTo={navigateTo} />;
      case 'reportHistory':
        return <ReportHistory navigateTo={navigateTo} />;
      default:
        return <MapExplorer user={user} navigateTo={navigateTo} />;
    }
  };

  return (
    <>
      {renderPage()}
      <Toaster />
    </>
  );
}
