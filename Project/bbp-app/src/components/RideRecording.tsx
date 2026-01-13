import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { StopCircleIcon, AlertCircleIcon, CheckCircleIcon, XIcon } from 'lucide-react';
import MapView from './MapView';
import { Page, Issue } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner@2.0.3';

type RideRecordingProps = {
  navigateTo: (page: Page, data?: any) => void;
};

export default function RideRecording({ navigateTo }: RideRecordingProps) {
  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [path, setPath] = useState<[number, number][]>([]);
  const [detectedIssues, setDetectedIssues] = useState<Issue[]>([]);
  const [showIssueAlert, setShowIssueAlert] = useState(false);
  const [currentIssue, setCurrentIssue] = useState<Issue | null>(null);

  useEffect(() => {
    // Simulate ride recording
    const timer = setInterval(() => {
      setDuration((prev) => prev + 1);
      setDistance((prev) => prev + 0.01);
      setSpeed(Math.random() * 15 + 10);

      // Add to path
      setPath((prev) => [
        ...prev,
        [39.9042 + Math.random() * 0.01, 116.4074 + Math.random() * 0.01],
      ]);

      // Randomly detect issues
      if (Math.random() < 0.05) {
        const newIssue: Issue = {
          id: `issue-${Date.now()}`,
          type: 'pothole',
          location: [39.9042 + Math.random() * 0.01, 116.4074 + Math.random() * 0.01],
          severity: 'medium',
          status: 'pending',
          date: new Date().toISOString(),
          autoDetected: true,
        };
        setCurrentIssue(newIssue);
        setShowIssueAlert(true);
        
        // Vibration simulation (toast notification)
        toast.warning('Road issue detected', {
          description: 'Please confirm to report this issue',
          duration: 3000,
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleConfirmIssue = () => {
    if (currentIssue) {
      setDetectedIssues((prev) => [...prev, { ...currentIssue, status: 'confirmed' }]);
    }
    setShowIssueAlert(false);
    setCurrentIssue(null);
    toast.success('Issue confirmed');
  };

  const handleIgnoreIssue = () => {
    setShowIssueAlert(false);
    setCurrentIssue(null);
  };

  const handleStop = () => {
    navigateTo('rideRecordConfirm', {
      id: `ride-${Date.now()}`,
      date: new Date().toISOString(),
      distance: parseFloat(distance.toFixed(2)),
      duration,
      avgSpeed: parseFloat((distance / (duration / 3600)).toFixed(1)),
      maxSpeed: parseFloat((speed * 1.5).toFixed(1)),
      path,
      issues: detectedIssues,
    });
  };

  return (
    <div className="h-screen flex flex-col bg-white relative">
      {/* Map - Full Screen */}
      <div className="flex-1 relative">
        <MapView
          userPath={path}
          currentLocation={path[path.length - 1]}
          issues={detectedIssues.map((issue) => ({
            location: issue.location,
            type: issue.type,
          }))}
        />
      </div>

      {/* Stats Panel */}
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute top-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-4"
      >
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-gray-900 mb-1">{formatTime(duration)}</p>
            <p className="text-gray-600">Duration</p>
          </div>
          <div>
            <p className="text-gray-900 mb-1">{distance.toFixed(2)} km</p>
            <p className="text-gray-600">Distance</p>
          </div>
          <div>
            <p className="text-gray-900 mb-1">{speed.toFixed(1)} km/h</p>
            <p className="text-gray-600">Speed</p>
          </div>
        </div>
      </motion.div>

      {/* Issue Alert */}
      <AnimatePresence>
        {showIssueAlert && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 w-80 max-w-[90%]"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.5, repeat: 3 }}
            >
              <AlertCircleIcon className="w-16 h-16 text-orange-600 mx-auto mb-4" />
            </motion.div>
            <h3 className="text-gray-900 text-center mb-2">
              Road Issue Detected
            </h3>
            <p className="text-gray-600 text-center mb-6">
              System auto-detected possible pothole, confirm to report?
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-12"
                onClick={handleIgnoreIssue}
              >
                <XIcon className="w-5 h-5 mr-2" />
                Ignore
              </Button>
              <Button
                className="flex-1 h-12 bg-orange-600 hover:bg-orange-700"
                onClick={handleConfirmIssue}
              >
                <CheckCircleIcon className="w-5 h-5 mr-2" />
                Confirm
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stop Button */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
      >
        <Button
          className="h-20 w-20 rounded-full bg-red-600 hover:bg-red-700 shadow-2xl"
          onClick={handleStop}
        >
          <StopCircleIcon className="w-10 h-10" />
        </Button>
      </motion.div>

      {/* Issues Counter */}
      {detectedIssues.length > 0 && (
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="absolute top-32 right-4 bg-orange-600 text-white rounded-full px-4 py-2 shadow-lg"
        >
          <span>{detectedIssues.length} issues</span>
        </motion.div>
      )}
    </div>
  );
}