'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Camera,
  CheckCircle2,
  Loader2,
  MapPin,
  ShieldCheck,
  User,
  Video,
  XCircle,
} from 'lucide-react';

import { useDoc, useMemoFirebase } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import { useWorkerProfile } from '@/hooks/use-worker-profile';
import { buildWorkerLogEntry, isAssignedToWorker, isOpenLowPriorityTask, workerStatusColors } from '@/lib/worker';
import type { Report } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

function MediaPreview({
  label,
  url,
  mediaType,
}: {
  label: string;
  url?: string;
  mediaType?: 'image' | 'video';
}) {
  if (!url) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        {label} not uploaded yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{label}</p>
      {mediaType === 'video' ? (
        <video src={url} controls className="w-full rounded-xl" />
      ) : (
        <Image src={url} alt={label} width={1200} height={800} className="w-full rounded-xl object-cover" />
      )}
    </div>
  );
}

export default function WorkerTaskPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { workerId, workerName, isLoading: isWorkerLoading } = useWorkerProfile();
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const reportRef = useMemoFirebase(() => {
    if (!firestore || !params.id) return null;
    return doc(firestore, 'reports', params.id);
  }, [firestore, params.id]);

  const { data: report, isLoading } = useDoc<Report>(reportRef);

  const isMine = useMemo(() => {
    if (!report) return false;
    return isAssignedToWorker(report, workerId, workerName);
  }, [report, workerId, workerName]);

  const isSelfAssignable = report ? isOpenLowPriorityTask(report) : false;
  const canOperate = isMine || isSelfAssignable;
  const mapsUrl =
    report?.latitude && report?.longitude
      ? `https://www.google.com/maps?q=${report.latitude},${report.longitude}`
      : `https://www.google.com/maps?q=${encodeURIComponent(report?.location || '')}`;

  async function runTaskAction(action: 'accept' | 'reject' | 'complete') {
    if (!report || !reportRef || !workerId) return;

    setActiveAction(action);

    try {
      if (action === 'accept') {
        await updateDoc(reportRef, {
          assignedWorkerId: workerId,
          assignedContractor: workerName,
          workerAssignmentStatus: 'Accepted',
          acceptedAt: report.acceptedAt || new Date().toISOString(),
          selfAssigned: report.selfAssigned || isSelfAssignable,
          status: 'Assigned',
          workflowStage: 'assigned_worker',
          actionLog: arrayUnion(buildWorkerLogEntry('Assigned', workerName, isSelfAssignable ? 'Task self-assigned by worker.' : 'Task accepted by worker.')),
        });

        toast({ title: 'Task accepted', description: 'You can now upload before-work proof and begin the job.' });
        return;
      }

      if (action === 'reject') {
        await updateDoc(reportRef, {
          assignedWorkerId: null,
          assignedContractor: null,
          workerAssignmentStatus: 'Rejected',
          selfAssigned: false,
          status: 'Submitted',
          workflowStage: 'pending_department',
          actionLog: arrayUnion(buildWorkerLogEntry('Submitted', workerName, 'Task rejected by worker and returned for reassignment.')),
        });

        toast({ title: 'Task rejected', description: 'The task has been released back for reassignment.' });
        router.push('/worker/task');
        return;
      }

      if (!report.afterWorkMediaUrl && !report.afterImageUrl) {
        toast({
          variant: 'destructive',
          title: 'After-work proof required',
          description: 'Upload after-work image or video before marking this task completed.',
        });
        return;
      }

      await updateDoc(reportRef, {
        status: 'Resolved',
        completedAt: new Date().toISOString(),
        workflowStage: 'completed',
        workerAssignmentStatus: 'Accepted',
        actionLog: arrayUnion(buildWorkerLogEntry('Resolved', workerName, 'Task marked as completed by worker.')),
      });

      toast({ title: 'Task completed', description: 'The task has been moved to your history.' });
      router.push('/worker/history');
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Action failed',
        description: 'Please try again in a moment.',
      });
    } finally {
      setActiveAction(null);
    }
  }

  if (isLoading || isWorkerLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1.5fr,1fr]">
        <Skeleton className="h-[420px] w-full" />
        <Skeleton className="h-[420px] w-full" />
      </div>
    );
  }

  if (!report) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Task not found</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" className="px-0">
        <Link href={isMine ? '/worker/task' : '/worker/open-tasks'}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-[1.6fr,1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle className="text-2xl">{report.description}</CardTitle>
                  <CardDescription className="mt-2">Report ID: {report.id}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge className={workerStatusColors[report.status]}>{report.status}</Badge>
                  <Badge variant="secondary">{report.priority || 'N/A'}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <MediaPreview label="Citizen evidence" url={report.imageUrl} mediaType="image" />
              <div className="space-y-6">
                <MediaPreview label="Before work proof" url={report.beforeWorkMediaUrl} mediaType={report.beforeWorkMediaType} />
                <MediaPreview
                  label="After work proof"
                  url={report.afterWorkMediaUrl || report.afterImageUrl}
                  mediaType={report.afterWorkMediaType || (report.afterImageUrl ? 'image' : undefined)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Workflow Progress</CardTitle>
              <CardDescription>Use these steps to finish the task from the field.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Task accepted', done: report.workerAssignmentStatus === 'Accepted' || isMine },
                { label: 'Before proof uploaded', done: !!report.beforeWorkMediaUrl },
                { label: 'After proof uploaded', done: !!(report.afterWorkMediaUrl || report.afterImageUrl) },
                { label: 'Task completed', done: report.status === 'Resolved' },
              ].map((step) => (
                <div key={step.label} className="rounded-2xl border p-4">
                  <div className="flex items-center gap-2">
                    {step.done ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <AlertTriangle className="h-5 w-5 text-amber-500" />}
                    <span className="font-medium">{step.label}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Worker Actions</CardTitle>
              <CardDescription>Accept, reject, upload proof, and close the task.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!canOperate ? (
                <Alert>
                  <ShieldCheck className="h-4 w-4" />
                  <AlertTitle>Read only</AlertTitle>
                  <AlertDescription>This task is not currently assigned to you and is not available for self-assignment.</AlertDescription>
                </Alert>
              ) : null}

              {canOperate && !isMine ? (
                <Button className="w-full" onClick={() => runTaskAction('accept')} disabled={activeAction === 'accept'}>
                  {activeAction === 'accept' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Accept Task
                </Button>
              ) : null}

              {isMine ? (
                <>
                  {report.workerAssignmentStatus !== 'Accepted' ? (
                    <Button className="w-full" onClick={() => runTaskAction('accept')} disabled={activeAction === 'accept'}>
                      {activeAction === 'accept' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Accept Assignment
                    </Button>
                  ) : null}
                  <Button asChild className="w-full" variant="outline">
                    <Link href={`/worker/task/${report.id}/before`}>
                      <Camera className="mr-2 h-4 w-4" />
                      Before Upload Page
                    </Link>
                  </Button>
                  <Button asChild className="w-full" variant="outline">
                    <Link href={`/worker/task/${report.id}/after`}>
                      <Video className="mr-2 h-4 w-4" />
                      After Upload Page
                    </Link>
                  </Button>
                  <Button className="w-full" onClick={() => runTaskAction('complete')} disabled={activeAction === 'complete'}>
                    {activeAction === 'complete' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    Mark Task Completed
                  </Button>
                  {report.status !== 'Resolved' ? (
                    <Button className="w-full" variant="destructive" onClick={() => runTaskAction('reject')} disabled={activeAction === 'reject'}>
                      {activeAction === 'reject' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                      Reject Task
                    </Button>
                  ) : null}
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Task Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="mt-1 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-semibold">{report.location}</p>
                  <Button variant="link" asChild className="h-auto p-0">
                    <Link href={mapsUrl} target="_blank" rel="noopener noreferrer">
                      Open in Google Maps
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </div>
              <Separator />
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Reported by</p>
                  <p className="text-sm text-muted-foreground">{report.userName}</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Reported on</p>
                  <p className="text-sm text-muted-foreground">{new Date(report.timestamp).toLocaleString()}</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Department</p>
                  <p className="text-sm text-muted-foreground">{report.department}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
