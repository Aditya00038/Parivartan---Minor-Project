'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { 
  Bot, Flag, List, Clock, CheckCircle, TrendingUp, Trophy,
  PlusCircle, Bell, Star, ArrowRight, Flame, Medal
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import type { Report, User as UserType } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { doc } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';

const statusColors: Record<string, string> = {
  Submitted: 'bg-blue-500',
  'Under Verification': 'bg-yellow-500',
  Assigned: 'bg-orange-500',
  'In Progress': 'bg-amber-600',
  Resolved: 'bg-green-600',
  Rejected: 'bg-red-600',
};

const MILESTONES = [
  { count: 3, label: 'Discount Coupon', emoji: '🎫' },
  { count: 5, label: 'Cashback ₹500', emoji: '💸' },
  { count: 10, label: 'Monthly Bus Pass', emoji: '🚌' },
];

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function CitizenDashboardPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const profileRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);
  const { data: profile } = useDoc<UserType>(profileRef);

  const allReportsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'reports'));
  }, [firestore]);

  const myReportsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'reports'), where('userId', '==', user.uid), orderBy('timestamp', 'desc'), limit(4));
  }, [firestore, user?.uid]);

  const { data: allReports, isLoading } = useCollection<Report>(allReportsQuery);
  const { data: myReports, isLoading: myLoading } = useCollection<Report>(myReportsQuery);

  const cityStats = useMemo(() => {
    if (!allReports) return null;
    const now = new Date();
    const h24 = new Date(now.getTime() - 86_400_000);
    const resolvedToday = allReports.filter(r => {
      if (r.status !== 'Resolved') return false;
      const logEntry = r.actionLog?.find(l => l.status === 'Resolved');
      return logEntry ? new Date(logEntry.timestamp) > h24 : false;
    }).length;
    return {
      total: allReports.length,
      inProgress: allReports.filter(r => ['Assigned', 'In Progress'].includes(r.status)).length,
      resolvedToday,
    };
  }, [allReports]);

  const myPoints = profile?.points ?? 0;
  const verifiedResolved = useMemo(() => {
    if (!myReports || !user?.uid) return 0;
    return myReports.filter(r => r.status === 'Resolved' && (
      r.aiAnalysis?.verificationSuggestion?.toLowerCase().includes('genuine') ||
      (r.actionLog?.length ?? 0) > 0
    )).length;
  }, [myReports, user?.uid]);

  const nextMilestone = MILESTONES.find(m => verifiedResolved < m.count);
  const milestoneProgress = nextMilestone ? Math.round((verifiedResolved / nextMilestone.count) * 100) : 100;

  return (
    <div className="flex-1 space-y-4 p-4 pt-2 pb-8">
      {/* Hero greeting */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-lg">
        <p className="text-sm text-white/75">{getGreeting()},</p>
        <h1 className="text-xl font-bold mt-0.5">{profile?.name?.split(' ')[0] ?? 'Citizen'} 👋</h1>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1.5 text-sm font-semibold">
            <Star className="h-4 w-4 fill-yellow-300 text-yellow-300" />
            {myPoints} pts
          </div>
          <Button size="sm" asChild className="ml-auto bg-white text-emerald-700 hover:bg-white/90 rounded-full font-semibold">
            <Link href="/citizen/report"><PlusCircle className="mr-1.5 h-4 w-4" />Report Issue</Link>
          </Button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { href: '/citizen/my-complaints', icon: List, label: 'My Reports', color: 'bg-blue-50 text-blue-600' },
          { href: '/citizen/notifications', icon: Bell, label: 'Alerts', color: 'bg-purple-50 text-purple-600' },
          { href: '/citizen/leaderboard', icon: Trophy, label: 'Ranks', color: 'bg-amber-50 text-amber-600' },
          { href: '/citizen/chatbot', icon: Bot, label: 'Roadie AI', color: 'bg-pink-50 text-pink-600' },
        ].map(a => (
          <Link key={a.href} href={a.href}>
            <div className={`flex flex-col items-center gap-1.5 rounded-xl p-3 ${a.color} transition-all active:scale-95 hover:shadow-sm`}>
              <a.icon className="h-5 w-5" />
              <p className="text-xs font-semibold text-center leading-tight">{a.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* City stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'City Reports', value: cityStats?.total, icon: Flag, color: 'text-blue-500' },
          { label: 'In Progress', value: cityStats?.inProgress, icon: Flame, color: 'text-orange-500' },
          { label: 'Resolved Today', value: cityStats?.resolvedToday, icon: CheckCircle, color: 'text-green-500' },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <s.icon className={`h-4 w-4 mx-auto mb-1 ${s.color}`} />
              {isLoading ? <Skeleton className="h-5 w-8 mx-auto" /> : <p className="text-lg font-bold">{s.value ?? 0}</p>}
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reward progress */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Medal className="h-5 w-5 text-amber-500" />
              <p className="text-sm font-semibold">Reward Progress</p>
            </div>
            <Link href="/citizen/leaderboard" className="text-xs text-amber-600 hover:underline flex items-center gap-1">
              Leaderboard <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">
                  {nextMilestone ? `${verifiedResolved}/${nextMilestone.count} verified reports` : '🎉 All milestones unlocked!'}
                </span>
                {nextMilestone && <span className="font-medium text-orange-600">{milestoneProgress}%</span>}
              </div>
              <Progress value={milestoneProgress} className="h-2.5 [&>div]:bg-gradient-to-r [&>div]:from-amber-400 [&>div]:to-orange-500" />
            </div>
            {nextMilestone && (
              <div className="text-center bg-amber-50 rounded-xl px-3 py-2 border border-amber-200">
                <p className="text-xl">{nextMilestone.emoji}</p>
                <p className="text-[10px] font-semibold text-amber-700">{nextMilestone.label}</p>
              </div>
            )}
          </div>

          <div className="mt-3 flex gap-2">
            {MILESTONES.map(m => (
              <div key={m.count} className={`flex-1 rounded-lg border p-2 text-center text-[10px] ${verifiedResolved >= m.count ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <p className="text-base">{m.emoji}</p>
                <p className={`font-semibold ${verifiedResolved >= m.count ? 'text-green-700' : 'text-gray-500'}`}>{m.count} reports</p>
                <p className={verifiedResolved >= m.count ? 'text-green-600' : 'text-gray-400'}>{verifiedResolved >= m.count ? '✓ Unlocked' : 'Locked'}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* My recent reports */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <List className="h-4 w-4" />My Recent Reports
          </CardTitle>
          <Link href="/citizen/my-complaints" className="text-xs text-primary hover:underline flex items-center gap-0.5">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {myLoading && [1,2,3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
          {!myLoading && myReports?.length === 0 && (
            <div className="py-6 text-center">
              <Flag className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No reports yet</p>
              <Button asChild size="sm" variant="outline" className="mt-2">
                <Link href="/citizen/report">Submit your first report</Link>
              </Button>
            </div>
          )}
          {!myLoading && myReports?.map(r => (
            <Link key={r.id} href={`/citizen/complaint/${r.id}`}
              className="flex items-center gap-3 p-2.5 border rounded-xl hover:bg-muted/50 transition-colors active:scale-[0.99]">
              <div className={`h-2 w-2 shrink-0 rounded-full ${statusColors[r.status]}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.description}</p>
                <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(r.timestamp), { addSuffix: true })}</p>
              </div>
              <Badge className={`${statusColors[r.status]} text-white text-[10px] border-0`}>{r.status}</Badge>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
