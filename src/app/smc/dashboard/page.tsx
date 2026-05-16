'use client';
import {
  Activity,
  ArrowUpRight,
  CheckCircle,
  FileText,
  Timer,
  TrendingUp,
  MapPin,
  Flame,
  AlertTriangle,
  Clock,
  Filter,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, DocumentData, Query } from 'firebase/firestore';
import type { Report } from '@/lib/types';
import { useFirestore } from '@/firebase/provider';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';

// Dynamically import HeatMap to avoid SSR issues with Leaflet
const HeatMap = dynamic(() => import('@/components/heat-map'), {
  ssr: false,
  loading: () => <div className="w-full h-[400px] bg-muted animate-pulse rounded-lg flex items-center justify-center">Loading Map...</div>
});

const statusColors: { [key: string]: string } = {
    Submitted: 'bg-blue-500',
    'Under Verification': 'bg-yellow-500',
    'In Progress': 'bg-amber-500',
    Assigned: 'bg-orange-500',
    Resolved: 'bg-green-500',
    Rejected: 'bg-red-500',
};

const statusGradients: { [key: string]: string } = {
    Submitted: 'from-blue-500 to-blue-600',
    'Under Verification': 'from-yellow-500 to-amber-500',
    'In Progress': 'from-amber-500 to-orange-500',
    Assigned: 'from-orange-500 to-red-400',
    Resolved: 'from-green-500 to-emerald-500',
    Rejected: 'from-red-500 to-red-600',
};


export default function SmcDashboard() {
  const firestore = useFirestore();
  
  // Filter states for map
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  const allReportsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'reports'), orderBy('timestamp', 'desc'));
  }, [firestore]) as Query<DocumentData> | null;

  const { data: reports, isLoading } = useCollection<Report>(allReportsQuery);

  const stats = useMemo(() => {
    if (!reports) {
      return {
        total: 0,
        pending: 0,
        inProgress: 0,
        resolved: 0,
        recentResolutions: [],
        resolutionTimeline: [],
        heatMapData: [],
        locationStats: [],
      };
    }

    const pending = reports.filter(r => r.status === 'Submitted' || r.status === 'Under Verification').length;
    const inProgress = reports.filter(r => r.status === 'Assigned' || r.status === 'In Progress').length;
    const resolved = reports.filter(r => r.status === 'Resolved').length;
    const recentResolutions = reports.filter(r => r.status === 'Resolved').slice(0, 5);

    // Calculate resolution timeline (last 7 days)
    const today = new Date();
    const resolutionTimeline = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (6 - i));
      const dateStr = date.toISOString().split('T')[0];
      
      const dayResolved = reports.filter(r => {
        if (r.status !== 'Resolved' || !r.actionLog) return false;
        const resolvedAction = r.actionLog.find(log => log.status === 'Resolved');
        if (!resolvedAction) return false;
        const resolvedDate = new Date(resolvedAction.timestamp).toISOString().split('T')[0];
        return resolvedDate === dateStr;
      }).length;

      const daySubmitted = reports.filter(r => {
        const submitDate = new Date(r.timestamp).toISOString().split('T')[0];
        return submitDate === dateStr;
      }).length;

      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        resolved: dayResolved,
        submitted: daySubmitted,
      };
    });

    // Heat map data - use actual report coordinates with category and department info
    const heatMapData = reports
      .filter(report => report.latitude && report.longitude)
      .map(report => ({
        lat: report.latitude!,
        lng: report.longitude!,
        location: report.location || 'Unknown Location',
        status: report.status,
        type: report.category,
        category: report.category, // Add category for filtering
        department: report.department, // Add department info
        reportId: report.id, // Add report ID for linking
        imageUrl: report.imageUrl, // Add image URL
        description: report.description, // Add description
        priority: report.priority, // Add priority
        date: new Date(report.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        count: 1,
      }));

    // Group nearby reports for clustering (within ~500m)
    const locationCounts: Record<string, { count: number; lat: number; lng: number; area: string }> = {};
    reports.forEach(report => {
      if (report.location) {
        const area = report.location.split(',')[0]?.trim() || 'Unknown';
        if (!locationCounts[area]) {
          locationCounts[area] = {
            count: 0,
            lat: report.latitude || 19.0760,
            lng: report.longitude || 72.8777,
            area,
          };
        }
        locationCounts[area].count++;
      }
    });

    // Location stats for bar visualization
    const locationStats = Object.entries(locationCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8)
      .map(([area, data]) => ({
        area: area.length > 20 ? area.substring(0, 20) + '...' : area,
        count: data.count,
      }));

    return {
      total: reports.length,
      pending,
      inProgress,
      resolved,
      recentResolutions,
      resolutionTimeline,
      heatMapData,
      locationStats,
    };
  }, [reports]);
  const uniqueCategories = useMemo(() => {
    if (!reports) return [];
    const cats = new Set(reports.map(r => r.category).filter(Boolean) as string[]);
    return Array.from(cats).sort();
  }, [reports]);

  const uniqueStatuses = useMemo(() => {
    if (!reports) return [];
    const stats = new Set(reports.map(r => r.status).filter(Boolean) as string[]);
    return Array.from(stats).sort();
  }, [reports]);

  // Toggle category filter
  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  // Toggle status filter
  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedStatuses([]);
  };

  // Calculate percentage change (mock data for demo)
  const pendingChange = stats.pending > 0 ? '+12%' : '0%';
  const resolvedChange = stats.resolved > 0 ? '+8%' : '0%';

  return (
    <main className="flex flex-1 flex-col gap-4">
      {/* Welcome Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground">Real-time insights into road infrastructure reports</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/smc/complaints">
              <FileText className="mr-2 h-4 w-4" />
              View All Reports
            </Link>
          </Button>
          <Button asChild size="sm" className="bg-gradient-to-r from-primary to-primary/80">
            <Link href="/smc/analytics">
              <TrendingUp className="mr-2 h-4 w-4" />
              Analytics
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards - Enhanced Design */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border border-border/50 bg-gradient-to-br from-blue-500/90 to-blue-600/90 text-white shadow-sm">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
            <CardTitle className="text-sm font-medium text-white/90">Total Reports</CardTitle>
            <div className="rounded-full bg-white/20 p-1.5">
              <FileText className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16 bg-white/20" /> : (
              <div className="text-3xl font-bold">{stats.total}</div>
            )}
            <p className="text-xs text-white/70 mt-1">
              All-time citizen submissions
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border border-border/50 bg-gradient-to-br from-amber-500/90 to-orange-500/90 text-white shadow-sm">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
            <CardTitle className="text-sm font-medium text-white/90">Pending Action</CardTitle>
            <div className="rounded-full bg-white/20 p-1.5">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16 bg-white/20" /> : (
              <div className="text-3xl font-bold">{stats.pending}</div>
            )}
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-white/70">Needs review</span>
              <Badge className="bg-white/20 text-white text-[10px] hover:bg-white/30">{pendingChange}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border border-border/50 bg-gradient-to-br from-violet-500/85 to-indigo-600/85 text-white shadow-sm">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
            <CardTitle className="text-sm font-medium text-white/90">In Progress</CardTitle>
            <div className="rounded-full bg-white/20 p-1.5">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16 bg-white/20" /> : (
              <div className="text-3xl font-bold">{stats.inProgress}</div>
            )}
            <p className="text-xs text-white/70 mt-1">
              Currently being worked on
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border border-border/50 bg-gradient-to-br from-emerald-500/90 to-green-600/90 text-white shadow-sm">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
            <CardTitle className="text-sm font-medium text-white/90">Resolved</CardTitle>
            <div className="rounded-full bg-white/20 p-1.5">
              <CheckCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16 bg-white/20" /> : (
              <div className="text-3xl font-bold">{stats.resolved}</div>
            )}
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-white/70">Completed</span>
              <Badge className="bg-white/20 text-white text-[10px] hover:bg-white/30">{resolvedChange}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Maharashtra Map Section - Full Width */}
      <Card className="overflow-hidden border border-border/60 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-blue-600/90 via-blue-500/90 to-indigo-500/90 py-3 text-white">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <MapPin className="h-4 w-4" />
                Maharashtra - Citizen Report Locations
              </CardTitle>
              <CardDescription className="mt-0.5 text-white/80">
                Live tracking of all reported issues across Maharashtra
              </CardDescription>
            </div>
            <Badge className="bg-white/20 text-white hover:bg-white/30">
              {stats.heatMapData.length} Locations
            </Badge>
          </div>
        </CardHeader>

        {/* Map Filters */}
        <div className="border-b bg-white/50 p-4 backdrop-blur-sm">
          <div className="space-y-3">
            {/* Category Filter */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <label className="text-sm font-medium text-muted-foreground">
                  Filter by Category
                </label>
                {selectedCategories.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedCategories.length} selected
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {uniqueCategories.length === 0 ? (
                  <span className="text-xs text-muted-foreground">No categories available</span>
                ) : (
                  uniqueCategories.map(category => (
                    <Button
                      key={category}
                      onClick={() => toggleCategory(category)}
                      variant={selectedCategories.includes(category) ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs"
                    >
                      {category}
                    </Button>
                  ))
                )}
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <label className="text-sm font-medium text-muted-foreground">
                  Filter by Status
                </label>
                {selectedStatuses.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedStatuses.length} selected
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {uniqueStatuses.length === 0 ? (
                  <span className="text-xs text-muted-foreground">No statuses available</span>
                ) : (
                  uniqueStatuses.map(status => (
                    <Button
                      key={status}
                      onClick={() => toggleStatus(status)}
                      variant={selectedStatuses.includes(status) ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs"
                    >
                      <div
                        className="mr-1.5 h-2 w-2 rounded-full"
                        style={{
                          backgroundColor:
                            status === 'Resolved' ? '#22c55e' :
                            status === 'In Progress' ? '#f59e0b' :
                            status === 'Assigned' ? '#f97316' :
                            status === 'Under Verification' ? '#eab308' :
                            status === 'Submitted' ? '#3b82f6' :
                            '#ef4444'
                        }}
                      />
                      {status}
                    </Button>
                  ))
                )}
              </div>
            </div>

            {/* Clear Filters Button */}
            {(selectedCategories.length > 0 || selectedStatuses.length > 0) && (
              <div className="pt-2">
                <Button
                  onClick={clearAllFilters}
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="mr-1 h-3 w-3" />
                  Clear All Filters
                </Button>
              </div>
            )}
          </div>
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <Skeleton className="h-[420px] w-full md:h-[440px]" />
          ) : (
            <div className="h-[420px] md:h-[440px]">
              <HeatMap 
                data={stats.heatMapData}
                selectedCategories={selectedCategories}
                selectedStatuses={selectedStatuses}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Timeline Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Resolution Timeline
                </CardTitle>
                <CardDescription>
                  Last 7 days activity
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={stats.resolutionTimeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSubmitted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  width={40}
                />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    padding: '12px 16px',
                  }}
                  labelStyle={{ fontWeight: 600, marginBottom: 8 }}
                  cursor={{ stroke: '#d1d5db', strokeWidth: 1, strokeDasharray: '5 5' }}
                />
                <Legend 
                  iconType="circle"
                  wrapperStyle={{ paddingTop: 20 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="submitted" 
                  stroke="#3b82f6" 
                  fillOpacity={1}
                  fill="url(#colorSubmitted)"
                  strokeWidth={2.5}
                  name="Submitted"
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 2, fill: '#fff' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="resolved" 
                  stroke="#10b981" 
                  fillOpacity={1}
                  fill="url(#colorResolved)"
                  strokeWidth={2.5}
                  name="Resolved"
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 2, fill: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Locations Bar Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-red-500" />
                  Top Report Locations
                </CardTitle>
                <CardDescription>
                  Most reported areas in the city
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({length: 6}).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : stats.locationStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.locationStats} layout="vertical" margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#f43f5e" />
                      <stop offset="50%" stopColor="#fb923c" />
                      <stop offset="100%" stopColor="#fbbf24" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={true} vertical={false} />
                  <XAxis 
                    type="number" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                  />
                  <YAxis 
                    dataKey="area" 
                    type="category" 
                    width={90} 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#374151', fontSize: 11, fontWeight: 500 }} 
                  />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                      padding: '12px 16px',
                    }}
                    labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="url(#barGradient)"
                    radius={[0, 8, 8, 0]}
                    name="Reports"
                    barSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                No location data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Reports and Resolutions */}
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2 shadow-lg">
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Recent Reports
              </CardTitle>
              <CardDescription>
                The latest reports from citizens
              </CardDescription>
            </div>
            <Button asChild size="sm" className="ml-auto gap-1 bg-gradient-to-r from-primary to-primary/80">
              <Link href="/smc/complaints">
                View All
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-6 px-6">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Citizen</TableHead>
                  <TableHead className="hidden sm:table-cell">Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && Array.from({length: 5}).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-6 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                        <TableCell className="text-right hidden md:table-cell"><Skeleton className="h-6 w-28 ml-auto" /></TableCell>
                    </TableRow>
                ))}
                {reports?.slice(0, 7).map(report => (
                <TableRow key={report.id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => window.location.href = `/smc/complaint/${report.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">{report.userName?.charAt(0) || 'C'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{report.userName}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {report.location?.substring(0, 30)}...
                        </div>
                      </div>
                    </div>
                  </TableCell>
                   <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline" className="font-normal">{report.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${statusColors[report.status] ?? 'bg-gray-500'} shadow-sm`}>{report.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right hidden md:table-cell text-muted-foreground">
                    {new Date(report.timestamp).toLocaleDateString()}
                  </TableCell>
                </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
            <div className="mt-4 flex justify-end">
              <Button asChild variant="outline" size="sm" className="gap-1">
                <Link href="/smc/complaints">
                  View More
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Recent Resolutions
            </CardTitle>
            <CardDescription>
              Recently completed work by field teams
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {isLoading ? (
                Array.from({length: 3}).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded-xl" />
                        <div className="space-y-1 flex-1">
                           <Skeleton className="h-4 w-full" />
                           <Skeleton className="h-3 w-3/4" />
                        </div>
                    </div>
                ))
            ) : stats.recentResolutions.length > 0 ? (
              stats.recentResolutions.map(report => (
                <Link 
                  href={`/smc/complaint/${report.id}`} 
                  key={report.id} 
                  className="flex items-center gap-4 p-3 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 hover:shadow-md transition-all duration-200 border border-green-100 dark:border-green-900/30"
                >
                   {report.afterImageUrl ? (
                        <Avatar className="h-12 w-12 rounded-xl">
                            <AvatarImage src={report.afterImageUrl} alt="Resolved work" className="object-cover" />
                            <AvatarFallback className="rounded-xl bg-green-100 dark:bg-green-900"><CheckCircle className="h-5 w-5 text-green-500" /></AvatarFallback>
                        </Avatar>
                   ) : (
                        <div className="h-12 w-12 bg-green-100 dark:bg-green-900 rounded-xl flex items-center justify-center">
                            <CheckCircle className="h-6 w-6 text-green-500" />
                        </div>
                   )}
                  <div className="grid gap-1 flex-1 min-w-0">
                    <p className="text-sm font-medium leading-none truncate">
                      {report.description?.substring(0,40)}...
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      📍 {report.location?.substring(0,35)}...
                    </p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              ))
            ) : (
                <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-xl bg-muted/20">
                    <CheckCircle className="h-10 w-10 text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground text-center text-sm">No reports have been resolved recently</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
