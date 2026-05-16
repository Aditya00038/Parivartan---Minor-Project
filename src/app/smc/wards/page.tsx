'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Report } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Building, FileText, Activity } from 'lucide-react';
import { departments } from '@/lib/constants';

interface DepartmentStats {
  total: number;
  open: number;
}

export default function SmcWardsPage() {
  const firestore = useFirestore();

  const reportsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'reports'));
  }, [firestore]);

  const { data: reports, isLoading } = useCollection<Report>(reportsQuery);

  const departmentData = useMemo(() => {
    if (!reports) return null;

    const stats: Record<string, DepartmentStats> = departments.reduce((acc, dept) => {
        acc[dept] = { total: 0, open: 0 };
        return acc;
    }, {} as Record<string, DepartmentStats>);
    stats['Unassigned'] = { total: 0, open: 0 };

    reports.forEach(report => {
      const dept = report.department || 'Unassigned';
      if (stats[dept]) {
        stats[dept].total++;
        if (report.status !== 'Resolved' && report.status !== 'Rejected') {
          stats[dept].open++;
        }
      }
    });

    return Object.entries(stats)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.open - a.open);
  }, [reports]);

  return (
    <div className="space-y-8">
       <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 md:p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Department Workload</h1>
        <p className="text-base md:text-lg">A real-time overview of report distribution across departments.</p>
      </div>

      {isLoading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-7 w-3/5" /></CardHeader>
              <CardContent className="flex justify-between">
                <div className="space-y-2"><Skeleton className="h-5 w-20" /><Skeleton className="h-4 w-12" /></div>
                <div className="space-y-2"><Skeleton className="h-5 w-20" /><Skeleton className="h-4 w-12" /></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && departmentData && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {departmentData.map(dept => (
            <Card key={dept.name}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Building className="h-6 w-6 text-primary" />
                  {dept.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex justify-around text-center">
                <div>
                  <p className="text-2xl font-bold">{dept.open}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Activity className="h-3 w-3" /> Open Cases</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{dept.total}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><FileText className="h-3 w-3" /> Total Reports</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
