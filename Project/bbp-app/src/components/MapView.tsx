import React from 'react';

type Path = {
  id: string;
  coordinates: [number, number][];
  condition: 'excellent' | 'good' | 'fair' | 'poor';
};

type MapViewProps = {
  paths?: Path[];
  highlightedPaths?: Path[];
  currentLocation?: [number, number];
  issues?: { location: [number, number]; type: string }[];
  userPath?: [number, number][];
};

export default function MapView({
  paths = [],
  highlightedPaths = [],
  currentLocation,
  issues = [],
  userPath = [],
}: MapViewProps) {
  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent':
        return '#22c55e'; // green-500
      case 'good':
        return '#3b82f6'; // blue-500
      case 'fair':
        return '#eab308'; // yellow-500
      case 'poor':
        return '#ef4444'; // red-500
      default:
        return '#9ca3af'; // gray-400
    }
  };

  return (
    <div className="w-full h-full relative bg-gray-100">
      {/* Simulated Map Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-200">
        {/* Grid pattern to simulate map */}
        <svg className="w-full h-full opacity-20">
          <defs>
            <pattern
              id="grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="gray"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* SVG Layer for paths */}
      <svg className="absolute inset-0 w-full h-full">
        {/* Background paths */}
        {paths.map((path, index) => {
          const pathData = path.coordinates
            .map((coord, i) => {
              const x = ((coord[1] - 116.3) * 1000) % 100 + 20;
              const y = ((coord[0] - 39.8) * 1000) % 100 + 20;
              return `${i === 0 ? 'M' : 'L'} ${x}% ${y}%`;
            })
            .join(' ');

          return (
            <path
              key={path.id}
              d={pathData}
              fill="none"
              stroke={getConditionColor(path.condition)}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.6"
            />
          );
        })}

        {/* Highlighted paths (for route results) */}
        {highlightedPaths.map((path, index) => {
          const pathData = path.coordinates
            .map((coord, i) => {
              const x = ((coord[1] - 116.3) * 1000) % 100 + 20;
              const y = ((coord[0] - 39.8) * 1000) % 100 + 20;
              return `${i === 0 ? 'M' : 'L'} ${x}% ${y}%`;
            })
            .join(' ');

          return (
            <g key={`highlighted-${path.id}`}>
              <path
                d={pathData}
                fill="none"
                stroke={getConditionColor(path.condition)}
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.9"
              />
              {/* Start marker */}
              <circle
                cx={`${((path.coordinates[0][1] - 116.3) * 1000) % 100 + 20}%`}
                cy={`${((path.coordinates[0][0] - 39.8) * 1000) % 100 + 20}%`}
                r="8"
                fill="#22c55e"
                stroke="white"
                strokeWidth="2"
              />
              {/* End marker */}
              <circle
                cx={`${((path.coordinates[path.coordinates.length - 1][1] - 116.3) * 1000) % 100 + 20}%`}
                cy={`${((path.coordinates[path.coordinates.length - 1][0] - 39.8) * 1000) % 100 + 20}%`}
                r="8"
                fill="#ef4444"
                stroke="white"
                strokeWidth="2"
              />
            </g>
          );
        })}

        {/* User current path (during recording) */}
        {userPath.length > 0 && (
          <path
            d={userPath
              .map((coord, i) => {
                const x = ((coord[1] - 116.3) * 1000) % 100 + 20;
                const y = ((coord[0] - 39.8) * 1000) % 100 + 20;
                return `${i === 0 ? 'M' : 'L'} ${x}% ${y}%`;
              })
              .join(' ')}
            fill="none"
            stroke="#6366f1"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="5,5"
            opacity="0.8"
          />
        )}

        {/* Issues markers */}
        {issues.map((issue, index) => {
          const x = ((issue.location[1] - 116.3) * 1000) % 100 + 20;
          const y = ((issue.location[0] - 39.8) * 1000) % 100 + 20;
          return (
            <g key={`issue-${index}`}>
              <circle
                cx={`${x}%`}
                cy={`${y}%`}
                r="10"
                fill="#f97316"
                opacity="0.3"
              />
              <circle
                cx={`${x}%`}
                cy={`${y}%`}
                r="6"
                fill="#f97316"
                stroke="white"
                strokeWidth="2"
              />
            </g>
          );
        })}

        {/* Current location */}
        {currentLocation && (
          <g>
            <circle
              cx={`${((currentLocation[1] - 116.3) * 1000) % 100 + 20}%`}
              cy={`${((currentLocation[0] - 39.8) * 1000) % 100 + 20}%`}
              r="15"
              fill="#3b82f6"
              opacity="0.3"
            >
              <animate
                attributeName="r"
                from="15"
                to="25"
                dur="1.5s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                from="0.3"
                to="0"
                dur="1.5s"
                repeatCount="indefinite"
              />
            </circle>
            <circle
              cx={`${((currentLocation[1] - 116.3) * 1000) % 100 + 20}%`}
              cy={`${((currentLocation[0] - 39.8) * 1000) % 100 + 20}%`}
              r="8"
              fill="#3b82f6"
              stroke="white"
              strokeWidth="3"
            />
          </g>
        )}
      </svg>
    </div>
  );
}
