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
        <div className="max-w-4xl mx-auto grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3"><Skeleton className="h-5 w-3/5" /></CardHeader>
              <CardContent className="pb-4">
                <div className="grid grid-cols-3 gap-2 pt-3 border-t">
                  <Skeleton className="h-8 w-10 mx-auto" />
                  <Skeleton className="h-8 w-10 mx-auto" />
                  <Skeleton className="h-8 w-10 mx-auto" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Loaded Simple Aligned Cards Grid */}
      {!isLoading && departmentData && (
        <div className="max-w-4xl mx-auto grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {departmentData.map(dept => {
            const IconComponent = dept.icon;
            return (
              <Card key={dept.name} className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2.5 text-base font-bold">
                    <IconComponent className="h-5 w-5 text-primary shrink-0" />
                    <span className="truncate">{dept.name}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  {/* Clean Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 text-center border-t pt-3">
                    <div>
                      <p className="text-lg font-extrabold text-slate-800 dark:text-slate-200">{dept.totalWorkers}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
                        <Users className="h-3.5 w-3.5" /> Workers
                      </p>
                    </div>
                    <div>
                      <p className="text-lg font-extrabold text-amber-600 dark:text-amber-500">{dept.open}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
                        <Activity className="h-3.5 w-3.5" /> Open
                      </p>
                    </div>
                    <div>
                      <p className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">{dept.teams.length}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
                        <HardHat className="h-3.5 w-3.5" /> Teams
                      </p>
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
