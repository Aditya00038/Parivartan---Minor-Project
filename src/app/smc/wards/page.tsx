'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Report, User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Activity, 
  Users, 
  CheckCircle2, 
  HardHat,
  Wrench,
  Trash2,
  Droplet,
  Lightbulb,
  Building2
} from 'lucide-react';

interface DepartmentSpecification {
  name: string;
  handles: string[];
  teams: string[];
  legacyDepts: string[];
  categories: string[];
  icon: React.ComponentType<{ className?: string }>;
}

const departmentSpecifications: DepartmentSpecification[] = [
  {
    name: 'Road Maintenance Department',
    handles: ['Potholes', 'Road cracks', 'Damaged roads', 'Broken dividers'],
    teams: ['Road Repair Teams', 'Asphalt Workers'],
    legacyDepts: ['Engineering', 'Traffic & Roads', 'Roads'],
    categories: ['Pothole', 'Crack', 'Surface failure', 'Road marking', 'Traffic signal'],
    icon: Wrench,
  },
  {
    name: 'Solid Waste Management Department',
    handles: ['Garbage accumulation', 'Open waste dumping', 'Debris', 'Overflowing bins'],
    teams: ['Sanitation Teams', 'Garbage Truck Teams'],
    legacyDepts: ['Sanitation'],
    categories: ['Garbage/Debris', 'Garbage'],
    icon: Trash2,
  },
  {
    name: 'Water & Drainage Department',
    handles: ['Drainage blockage', 'Water leakage', 'Sewage overflow', 'Flooded roads'],
    teams: ['Drainage Cleaners', 'Pipeline Teams'],
    legacyDepts: ['Water Supply', 'Drainage'],
    categories: ['Water leak', 'Pipe burst', 'Manhole issue', 'Water-logged damage'],
    icon: Droplet,
  },
  {
    name: 'Electrical Department',
    handles: ['Streetlight failures', 'Exposed wires', 'Electrical hazards'],
    teams: ['Electrical Maintenance Teams'],
    legacyDepts: ['Electrical', 'Electricity'],
    categories: ['Street light', 'Streetlight Issue'],
    icon: Lightbulb,
  },
  {
    name: 'Construction & Public Works Department',
    handles: ['Illegal construction debris', 'Broken footpaths', 'Damaged public infrastructure'],
    teams: ['Civil Work Teams'],
    legacyDepts: ['Public Works'],
    categories: ['Public Works'],
    icon: Building2,
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

  return (
    <div className="space-y-8">
      {/* Aligned Header Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 md:p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Department Workload</h1>
        <p className="text-base md:text-lg">A real-time overview of report distribution across departments.</p>
      </div>

      {/* Loading Skeleton Grid */}
      {isLoading && (
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-7 w-3/5" /></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between"><Skeleton className="h-5 w-20" /><Skeleton className="h-5 w-20" /></div>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Loaded Simple Aligned Cards Grid */}
      {!isLoading && departmentData && (
        <div className="grid gap-6 md:grid-cols-2">
          {departmentData.map(dept => {
            const IconComponent = dept.icon;
            return (
              <Card key={dept.name}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <IconComponent className="h-6 w-6 text-primary" />
                    {dept.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Clean Stats Grid */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">{dept.totalWorkers}</p>
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <Users className="h-3 w-3" /> Workers
                      </p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-600">{dept.open}</p>
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <Activity className="h-3 w-3" /> Open Cases
                      </p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{dept.total}</p>
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <FileText className="h-3 w-3" /> Total Reports
                      </p>
                    </div>
                  </div>

                  {/* Core Responsibilities */}
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Core Responsibilities</p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-0.5">
                      {dept.handles.map(handle => (
                        <li key={handle} className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          {handle}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Designated Crews */}
                  <div className="space-y-2 pt-4 border-t">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Designated Crews</p>
                    <div className="flex flex-wrap gap-2">
                      {dept.teams.map(team => (
                        <Badge key={team} variant="secondary" className="flex items-center gap-1 font-medium">
                          <HardHat className="h-3 w-3 text-slate-500" />
                          {team}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
