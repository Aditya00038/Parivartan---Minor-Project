'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Report, User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  Building, 
  FileText, 
  Activity, 
  Users, 
  CheckCircle2, 
  ListTodo, 
  HardHat,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface DepartmentSpecification {
  name: string;
  handles: string[];
  teams: string[];
  legacyDepts: string[];
  categories: string[];
  icon: string;
  color: string;
  borderColor: string;
  iconBg: string;
  badgeBg: string;
}

const departmentSpecifications: DepartmentSpecification[] = [
  {
    name: 'Road Maintenance Department',
    handles: ['Potholes', 'Road cracks', 'Damaged roads', 'Broken dividers'],
    teams: ['Road Repair Teams', 'Asphalt Workers'],
    legacyDepts: ['Engineering', 'Traffic & Roads', 'Roads'],
    categories: ['Pothole', 'Crack', 'Surface failure', 'Road marking', 'Traffic signal'],
    icon: '🛣️',
    color: 'from-blue-500 to-indigo-600',
    borderColor: 'border-blue-100 dark:border-blue-900',
    iconBg: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600',
    badgeBg: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-800',
  },
  {
    name: 'Solid Waste Management Department',
    handles: ['Garbage accumulation', 'Open waste dumping', 'Debris', 'Overflowing bins'],
    teams: ['Sanitation Teams', 'Garbage Truck Teams'],
    legacyDepts: ['Sanitation'],
    categories: ['Garbage/Debris', 'Garbage'],
    icon: '🗑️',
    color: 'from-green-500 to-emerald-600',
    borderColor: 'border-green-100 dark:border-green-900',
    iconBg: 'bg-green-50 dark:bg-green-950/30 text-green-600',
    badgeBg: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-200 dark:border-green-800',
  },
  {
    name: 'Water & Drainage Department',
    handles: ['Drainage blockage', 'Water leakage', 'Sewage overflow', 'Flooded roads'],
    teams: ['Drainage Cleaners', 'Pipeline Teams'],
    legacyDepts: ['Water Supply', 'Drainage'],
    categories: ['Water leak', 'Pipe burst', 'Manhole issue', 'Water-logged damage'],
    icon: '💧',
    color: 'from-cyan-500 to-sky-600',
    borderColor: 'border-cyan-100 dark:border-cyan-900',
    iconBg: 'bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/40 dark:text-cyan-200 dark:border-cyan-800',
  },
  {
    name: 'Electrical Department',
    handles: ['Streetlight failures', 'Exposed wires', 'Electrical hazards'],
    teams: ['Electrical Maintenance Teams'],
    legacyDepts: ['Electrical', 'Electricity'],
    categories: ['Street light', 'Streetlight Issue'],
    icon: '💡',
    color: 'from-amber-500 to-orange-600',
    borderColor: 'border-amber-100 dark:border-amber-900',
    iconBg: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-800',
  },
  {
    name: 'Construction & Public Works Department',
    handles: ['Illegal construction debris', 'Broken footpaths', 'Damaged public infrastructure'],
    teams: ['Civil Work Teams'],
    legacyDepts: ['Public Works'],
    categories: ['Public Works'],
    icon: '🚧',
    color: 'from-purple-500 to-fuchsia-600',
    borderColor: 'border-purple-100 dark:border-purple-900',
    iconBg: 'bg-purple-50 dark:bg-purple-950/30 text-purple-600',
    badgeBg: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-800',
  }
];

export default function SmcWardsPage() {
  const firestore = useFirestore();

  const reportsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'reports'));
  }, [firestore]);

  const workersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'), where('role', '==', 'worker'));
  }, [firestore]);

  const { data: reports, isLoading: isReportsLoading } = useCollection<Report>(reportsQuery);
  const { data: workers, isLoading: isWorkersLoading } = useCollection<User>(workersQuery);

  const departmentData = useMemo(() => {
    if (!reports) return null;

    const workerList = workers || [];

    return departmentSpecifications.map(spec => {
      let open = 0;
      let total = 0;

      reports.forEach(report => {
        const reportCategory = report.category || '';
        const reportDept = report.department || '';

        const matchesCategory = spec.categories.some(cat => 
          reportCategory.toLowerCase().includes(cat.toLowerCase())
        );
        const matchesDept = spec.legacyDepts.some(dept => 
          reportDept.toLowerCase() === dept.toLowerCase()
        ) || reportDept.toLowerCase() === spec.name.toLowerCase();

        if (matchesCategory || matchesDept) {
          total++;
          if (report.status !== 'Resolved' && report.status !== 'Rejected') {
            open++;
          }
        }
      });

      const totalWorkers = workerList.filter(worker => {
        const workerDept = worker.department || '';
        const matchesDept = spec.legacyDepts.some(dept => 
          workerDept.toLowerCase() === dept.toLowerCase()
        ) || workerDept.toLowerCase() === spec.name.toLowerCase();
        
        return matchesDept;
      }).length;

      return {
        ...spec,
        open,
        total,
        totalWorkers
      };
    });
  }, [reports, workers]);

  const isLoading = isReportsLoading || isWorkersLoading;

  const totalOpenCases = useMemo(() => {
    if (!reports) return 0;
    return reports.filter(r => r.status !== 'Resolved' && r.status !== 'Rejected').length;
  }, [reports]);

  return (
    <div className="space-y-8 pb-12">
      {/* Dynamic Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-700 via-indigo-700 to-indigo-800 p-6 md:p-8 text-white shadow-xl">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-purple-300" />
            Live Municipal Command Center
          </div>
          <h1 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight">Department & Workload Overview</h1>
          <p className="mt-2 text-sm md:text-base text-purple-100 max-w-xl">
            Real-time tracking of active citizen reports, registered field workers, and operational teams across the municipality.
          </p>
          <div className="mt-5 flex flex-wrap gap-4 text-xs font-medium">
            <div className="rounded-lg bg-white/15 px-3.5 py-2 backdrop-blur-sm">
              <span className="text-purple-200 block">Total Active Cases</span>
              <span className="text-xl font-bold text-white mt-0.5 block">{totalOpenCases}</span>
            </div>
            <div className="rounded-lg bg-white/15 px-3.5 py-2 backdrop-blur-sm">
              <span className="text-purple-200 block">Active Staff Members</span>
              <span className="text-xl font-bold text-white mt-0.5 block">{workers?.length || 0}</span>
            </div>
          </div>
        </div>
        {/* Decorative backdrop elements */}
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 -mb-20 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl"></div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-slate-100 dark:border-slate-900 shadow-sm">
              <CardHeader className="flex flex-row items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="flex-1"><Skeleton className="h-6 w-3/4" /></div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between"><Skeleton className="h-10 w-24" /><Skeleton className="h-10 w-24" /></div>
                <Skeleton className="h-20 w-full rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Loaded Content */}
      {!isLoading && departmentData && (
        <div className="grid gap-6 md:grid-cols-2">
          {departmentData.map(dept => (
            <Card key={dept.name} className={`overflow-hidden border transition-all duration-300 hover:shadow-md ${dept.borderColor} bg-white dark:bg-slate-950/30`}>
              {/* Card Header with Department Info */}
              <div className="p-5 border-b border-slate-50 dark:border-slate-900/60 bg-gradient-to-r from-slate-50/50 to-transparent dark:from-slate-900/20">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl shadow-sm ${dept.iconBg}`}>
                      {dept.icon}
                    </span>
                    <div>
                      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight leading-snug">{dept.name}</h2>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mt-0.5">Municipal Unit</span>
                    </div>
                  </div>
                </div>
              </div>

              <CardContent className="p-5 space-y-5">
                {/* Stats Widget Grid */}
                <div className="grid grid-cols-3 gap-3">
                  {/* Total Workers */}
                  <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/10 p-3 text-center transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/20">
                    <span className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                      <Users className="h-3 w-3" /> Staff
                    </span>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{dept.totalWorkers}</p>
                    <span className="text-[10px] text-muted-foreground">Workers</span>
                  </div>

                  {/* Open Cases */}
                  <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/10 p-3 text-center transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/20">
                    <span className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                      <Activity className="h-3 w-3" /> Active
                    </span>
                    <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{dept.open}</p>
                    <span className="text-[10px] text-muted-foreground">Open Cases</span>
                  </div>

                  {/* Total Reports */}
                  <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/10 p-3 text-center transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/20">
                    <span className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                      <FileText className="h-3 w-3" /> Total
                    </span>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{dept.total}</p>
                    <span className="text-[10px] text-muted-foreground">Reports</span>
                  </div>
                </div>

                {/* Handles Section */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Core Responsibilities</span>
                  <div className="flex flex-wrap gap-1.5">
                    {dept.handles.map(handle => (
                      <span key={handle} className="inline-flex items-center gap-1 rounded-full bg-slate-100/80 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 font-medium">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                        {handle}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Specialist Teams & Crews */}
                <div className="border-t border-slate-50 dark:border-slate-900/60 pt-4 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Specialist Teams & Crews</span>
                  <div className="flex flex-wrap gap-2">
                    {dept.teams.map(team => (
                      <span 
                        key={team} 
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm ${dept.badgeBg}`}
                      >
                        <HardHat className="h-3.5 w-3.5 shrink-0" />
                        {team}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
