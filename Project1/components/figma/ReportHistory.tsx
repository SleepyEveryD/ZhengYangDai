import React, { useState } from 'react';
import { Button } from './ui/button';
import { ArrowLeftIcon, FilterIcon, CalendarIcon } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Page, Issue } from '../App';

type ReportHistoryProps = {
  navigateTo: (page: Page) => void;
};

const mockIssues: Issue[] = [
  {
    id: '1',
    type: 'pothole',
    location: [39.9142, 116.4174],
    severity: 'high',
    status: 'confirmed',
    date: '2025-11-07',
    description: 'Severe pothole, affecting cycling safety',
    autoDetected: true,
  },
  {
    id: '2',
    type: 'crack',
    location: [39.9042, 116.4074],
    severity: 'medium',
    status: 'confirmed',
    date: '2025-11-06',
    description: 'Road crack about 20cm',
    autoDetected: true,
  },
  {
    id: '3',
    type: 'obstacle',
    location: [39.9242, 116.4274],
    severity: 'low',
    status: 'fixed',
    date: '2025-11-05',
    description: 'Temporary obstacle',
    autoDetected: false,
  },
  {
    id: '4',
    type: 'pothole',
    location: [39.9342, 116.4374],
    severity: 'medium',
    status: 'pending',
    date: '2025-11-04',
    description: 'Moderate pothole',
    autoDetected: true,
  },
];

export default function ReportHistory({ navigateTo }: ReportHistoryProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'fixed'>('all');

  const getIssueTypeText = (type: string) => {
    switch (type) {
      case 'pothole':
        return 'Pothole';
      case 'crack':
        return 'Crack';
      case 'obstacle':
        return 'Obstacle';
      default:
        return 'Other';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-orange-100 text-orange-800';
      case 'low':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'Severe';
      case 'medium':
        return 'Moderate';
      case 'low':
        return 'Minor';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'fixed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmed';
      case 'pending':
        return 'Pending';
      case 'fixed':
        return 'Fixed';
      default:
        return 'Unknown';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  };

  const filteredIssues =
    filter === 'all'
      ? mockIssues
      : mockIssues.filter((issue) => issue.status === filter);

  const statusCounts = {
    all: mockIssues.length,
    pending: mockIssues.filter((i) => i.status === 'pending').length,
    confirmed: mockIssues.filter((i) => i.status === 'confirmed').length,
    fixed: mockIssues.filter((i) => i.status === 'fixed').length,
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-white border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigateTo('profile')}
          className="h-10 w-10"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-gray-900">My Reports</h2>
          <p className="text-gray-500">{mockIssues.length} records</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white border-b">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-12">
            <TabsTrigger value="all" className="relative">
              All
              {statusCounts.all > 0 && (
                <span className="ml-1 text-gray-500">({statusCounts.all})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="pending" className="relative">
              Pending
              {statusCounts.pending > 0 && (
                <span className="ml-1 text-gray-500">({statusCounts.pending})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="confirmed" className="relative">
              Confirmed
              {statusCounts.confirmed > 0 && (
                <span className="ml-1 text-gray-500">({statusCounts.confirmed})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="fixed" className="relative">
              Fixed
              {statusCounts.fixed > 0 && (
                <span className="ml-1 text-gray-500">({statusCounts.fixed})</span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Issue List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-3">
          {filteredIssues.map((issue) => (
            <Card key={issue.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-gray-900">
                        {getIssueTypeText(issue.type)}
                      </span>
                      <Badge className={getSeverityColor(issue.severity)} variant="secondary">
                        {getSeverityText(issue.severity)}
                      </Badge>
                      {issue.autoDetected && (
                        <Badge variant="outline">Auto-detected</Badge>
                      )}
                    </div>
                    {issue.description && (
                      <p className="text-gray-600 mb-2">{issue.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-gray-500">
                      <CalendarIcon className="w-4 h-4" />
                      <span>{formatDate(issue.date)}</span>
                    </div>
                  </div>
                  <Badge className={getStatusColor(issue.status)}>
                    {getStatusText(issue.status)}
                  </Badge>
                </div>

                <div className="pt-3 border-t">
                  <p className="text-gray-500">
                    Location: {issue.location[0].toFixed(4)}, {issue.location[1].toFixed(4)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredIssues.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <FilterIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-600">No {filter !== 'all' && getStatusText(filter)} records</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}