'use client';

import { useMemo, useState } from 'react';
import { useAuth, useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Report } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { UserCheck, Activity, CheckCircle, FileText, ClipboardPlus } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { buildAuthHeaders } from '@/lib/client-auth';
import { AlertCircle } from 'lucide-react';

const DEPARTMENT_OPTIONS = ['Engineering', 'Drainage', 'Electricity', 'Sanitation', 'Roads'];
const SKILL_OPTIONS = ['Garbage', 'Road Repair', 'Electrical'];
const DESIGNATION_OPTIONS = ['Sanitation Worker', 'Technician', 'Helper'];

interface ContractorStats {
  total: number;
  inProgress: number;
  resolved: number;
}

interface ContractorRecord {
  id: string;
  name: string;
  phoneNumber?: string;
  email?: string;
  department?: string;
  wardArea?: string;
}

export default function SmcContractsPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isCreatingContractor, setIsCreatingContractor] = useState(false);
  const [newContractor, setNewContractor] = useState({
    name: '',
    phoneNumber: '',
    email: '',
    department: 'Engineering',
    wardArea: '',
  });
  const [isCreatingWorker, setIsCreatingWorker] = useState(false);
  const [workerCreateConflictMessage, setWorkerCreateConflictMessage] = useState<string | null>(null);
  const [newWorker, setNewWorker] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    department: 'Engineering',
    designation: 'Helper',
    skillType: 'Road Repair',
    assignedContractor: '',
    wardArea: '',
  });

  const reportsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'reports'));
  }, [firestore]);

  const contractorsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'contractors'));
  }, [firestore]);

  const { data: reports, isLoading } = useCollection<Report>(reportsQuery);
  const { data: contractors } = useCollection<ContractorRecord>(contractorsQuery);

  const contractorData = useMemo(() => {
    if (!reports) return null;

    const stats: Record<string, ContractorStats> = {};

    reports.forEach(report => {
      if (report.assignedContractor) {
        const contractor = report.assignedContractor;
        if (!stats[contractor]) {
          stats[contractor] = { total: 0, inProgress: 0, resolved: 0 };
        }
        stats[contractor].total++;
        if (report.status === 'In Progress' || report.status === 'Assigned') {
          stats[contractor].inProgress++;
        } else if (report.status === 'Resolved') {
          stats[contractor].resolved++;
        }
      }
    });

    return Object.entries(stats).map(([name, data]) => ({
      name,
      ...data,
      completionRate: data.total > 0 ? (data.resolved / data.total) * 100 : 0,
    })).sort((a,b) => b.total - a.total);
  }, [reports]);

  const contractorDepartmentMap = useMemo(() => {
    const map: Record<string, string> = {};
    (contractors || []).forEach((contractor) => {
      if (contractor.name && contractor.department) {
        map[contractor.name] = contractor.department;
      }
    });

    (reports || []).forEach((report) => {
      if (!report.assignedContractor || !report.department) {
        return;
      }

      if (!map[report.assignedContractor]) {
        map[report.assignedContractor] = report.department;
      }
    });
    return map;
  }, [reports]);

  const contractorOptions = useMemo(() => {
    const set = new Set<string>();

    (contractors || []).forEach((contractor) => {
      if (contractor.name) {
        set.add(contractor.name);
      }
    });

    (contractorData || []).forEach((item) => {
      if (item.name) {
        set.add(item.name);
      }
    });

    return Array.from(set).sort();
  }, [contractors, contractorData]);

  const handleNewContractorChange = (field: keyof typeof newContractor, value: string) => {
    setNewContractor((previous) => ({ ...previous, [field]: value }));
  };

  const handleCreateContractor = async () => {
    if (!newContractor.name || !newContractor.phoneNumber || !newContractor.department) {
      toast({
        variant: 'destructive',
        title: 'Required fields missing',
        description: 'Contractor name, phone number, and department are required.',
      });
      return;
    }

    setIsCreatingContractor(true);
    try {
      const headers = await buildAuthHeaders(auth, { 'Content-Type': 'application/json' });
      const response = await fetch('/api/smc/contractors', {
        method: 'POST',
        headers,
        body: JSON.stringify(newContractor),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Contractor creation failed.');
      }

      toast({ title: 'Contractor added', description: `${newContractor.name} is now available for worker assignment.` });
      setNewContractor({
        name: '',
        phoneNumber: '',
        email: '',
        department: 'Engineering',
        wardArea: '',
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Could not add contractor',
        description: error instanceof Error ? error.message : 'Unknown error occurred while adding contractor.',
      });
    } finally {
      setIsCreatingContractor(false);
    }
  };

  const handleNewWorkerChange = (field: keyof typeof newWorker, value: string) => {
    if (workerCreateConflictMessage && (field === 'phoneNumber' || field === 'email')) {
      setWorkerCreateConflictMessage(null);
    }
    setNewWorker((previous) => ({ ...previous, [field]: value }));
  };

  const handleCreateWorker = async () => {
    setWorkerCreateConflictMessage(null);

    if (
      !newWorker.fullName ||
      !newWorker.phoneNumber ||
      !newWorker.department ||
      !newWorker.designation ||
      !newWorker.skillType ||
      !newWorker.assignedContractor ||
      !newWorker.wardArea
    ) {
      toast({
        variant: 'destructive',
        title: 'Required fields missing',
        description: 'Fill all required worker details before adding.',
      });
      return;
    }

    setIsCreatingWorker(true);
    try {
      const headers = await buildAuthHeaders(auth, { 'Content-Type': 'application/json' });
      const response = await fetch('/api/smc/workers', {
        method: 'POST',
        headers,
        body: JSON.stringify(newWorker),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Worker creation failed.');
      }

      toast({
        title: 'Worker added successfully',
        description:
          data?.smsStatus === 'failed'
            ? `Worker ID ${data.workerId} created, but SMS failed. Share credentials manually.`
            : `Worker ID ${data.workerId} created and SMS sent with Worker ID and password.`,
      });

      setNewWorker({
        fullName: '',
        phoneNumber: '',
        email: '',
        department: 'Engineering',
        designation: 'Helper',
        skillType: 'Road Repair',
        assignedContractor: '',
        wardArea: '',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred while adding worker.';
      const isExpectedConflict = /already exists/i.test(message);
      if (isExpectedConflict) {
        setWorkerCreateConflictMessage(message);
        return;
      }

      if (!isExpectedConflict) {
        console.error(error);
      }
      toast({
        variant: 'destructive',
        title: 'Could not add worker',
        description: message,
      });
    } finally {
      setIsCreatingWorker(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 md:p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Contractor Performance</h1>
        <p className="text-base md:text-lg">An overview of work distribution and completion rates.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserCheck /> Contractor & Worker Overview</CardTitle>
          <CardDescription>
            Performance metrics for all assigned contractors and field workers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 rounded-xl border p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <ClipboardPlus className="h-4 w-4" /> Add Contractor
            </h3>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <Input
                value={newContractor.name}
                onChange={(event) => handleNewContractorChange('name', event.target.value)}
                placeholder="Contractor Name"
              />
              <Input
                value={newContractor.phoneNumber}
                onChange={(event) => handleNewContractorChange('phoneNumber', event.target.value)}
                placeholder="Phone Number"
              />
              <Input
                value={newContractor.email}
                onChange={(event) => handleNewContractorChange('email', event.target.value)}
                placeholder="Email (optional)"
              />
              <Select value={newContractor.department} onValueChange={(value) => handleNewContractorChange('department', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENT_OPTIONS.map((department) => (
                    <SelectItem key={department} value={department}>{department}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={newContractor.wardArea}
                onChange={(event) => handleNewContractorChange('wardArea', event.target.value)}
                placeholder="Ward / Area"
              />
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={handleCreateContractor} disabled={isCreatingContractor}>
                {isCreatingContractor ? 'Adding contractor...' : 'Add Contractor'}
              </Button>
            </div>
          </div>

          <div className="mb-6 rounded-xl border p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <ClipboardPlus className="h-4 w-4" /> Add Worker Under Contractor
            </h3>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <Input
                value={newWorker.fullName}
                onChange={(event) => handleNewWorkerChange('fullName', event.target.value)}
                placeholder="Full Name"
              />
              <Input
                value={newWorker.phoneNumber}
                onChange={(event) => handleNewWorkerChange('phoneNumber', event.target.value)}
                placeholder="Phone Number"
              />
              <Input
                value={newWorker.email}
                onChange={(event) => handleNewWorkerChange('email', event.target.value)}
                placeholder="Email (optional)"
              />

              <Select value={newWorker.department} onValueChange={(value) => handleNewWorkerChange('department', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENT_OPTIONS.map((department) => (
                    <SelectItem key={department} value={department}>{department}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={newWorker.designation} onValueChange={(value) => handleNewWorkerChange('designation', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Role / Designation" />
                </SelectTrigger>
                <SelectContent>
                  {DESIGNATION_OPTIONS.map((designation) => (
                    <SelectItem key={designation} value={designation}>{designation}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={newWorker.skillType} onValueChange={(value) => handleNewWorkerChange('skillType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Skill Type" />
                </SelectTrigger>
                <SelectContent>
                  {SKILL_OPTIONS.map((skill) => (
                    <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={newWorker.assignedContractor}
                onValueChange={(value) => {
                  handleNewWorkerChange('assignedContractor', value);
                  const detectedDepartment = contractorDepartmentMap[value];
                  if (detectedDepartment && DEPARTMENT_OPTIONS.includes(detectedDepartment)) {
                    handleNewWorkerChange('department', detectedDepartment);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Assigned Contractor" />
                </SelectTrigger>
                <SelectContent>
                  {contractorOptions.map((contractor) => (
                    <SelectItem key={contractor} value={contractor}>{contractor}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                value={newWorker.wardArea}
                onChange={(event) => handleNewWorkerChange('wardArea', event.target.value)}
                placeholder="Ward / Area"
              />

              <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                Worker ID and Password are auto-generated and sent by SMS after successful creation.
              </div>
            </div>

            {workerCreateConflictMessage ? (
              <Alert variant="destructive" className="mt-3">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Worker already exists</AlertTitle>
                <AlertDescription>{workerCreateConflictMessage}</AlertDescription>
              </Alert>
            ) : null}

            <div className="mt-4 flex justify-end">
              <Button onClick={handleCreateWorker} disabled={isCreatingWorker || contractorOptions.length === 0}>
                {isCreatingWorker ? 'Adding worker...' : 'Add Worker'}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto -mx-6 px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contractor / Worker</TableHead>
                <TableHead className="text-center"><FileText className="inline-block mr-1 h-4 w-4" /> <span className="hidden sm:inline">Total</span></TableHead>
                <TableHead className="text-center hidden sm:table-cell"><Activity className="inline-block mr-1 h-4 w-4" /> In Progress</TableHead>
                <TableHead className="text-center hidden md:table-cell"><CheckCircle className="inline-block mr-1 h-4 w-4" /> Resolved</TableHead>
                <TableHead className="hidden sm:table-cell">Completion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-6 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-12 mx-auto" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-6 w-12 mx-auto" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-12 mx-auto" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-6 w-32" /></TableCell>
                </TableRow>
              ))}
              {!isLoading && contractorData?.map(c => (
                <TableRow key={c.name}>
                  <TableCell className="font-medium">
                    <div>{c.name}</div>
                    <div className="text-xs text-muted-foreground sm:hidden">
                      {c.resolved}/{c.total} completed ({c.completionRate.toFixed(0)}%)
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{c.total}</TableCell>
                  <TableCell className="text-center hidden sm:table-cell">{c.inProgress}</TableCell>
                  <TableCell className="text-center hidden md:table-cell">{c.resolved}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex items-center gap-2">
                      <Progress value={c.completionRate} className="h-2 w-24" />
                      <span className="text-xs text-muted-foreground">{c.completionRate.toFixed(0)}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
          {!isLoading && (!contractorData || contractorData.length === 0) && (
            <div className="text-center py-12 text-muted-foreground">
              No contractors have been assigned to tasks yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
