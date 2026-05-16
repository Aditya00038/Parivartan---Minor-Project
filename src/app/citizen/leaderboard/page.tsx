'use client';

import { useMemo } from 'react';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { Trophy, Medal, Star, Flag, CheckCircle2, Crown, Flame, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { useCollection, useMemoFirebase, useUser } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import type { User as UserType, Report } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const TIER_CONFIG = [
  { min: 50, label: 'Platinum Champion', icon: '🏆', color: 'from-slate-300 to-slate-500', badge: 'bg-slate-200 text-slate-800' },
  { min: 30, label: 'Gold Contributor', icon: '🥇', color: 'from-yellow-300 to-amber-500', badge: 'bg-yellow-100 text-yellow-800' },
  { min: 15, label: 'Silver Reporter', icon: '🥈', color: 'from-gray-200 to-gray-400', badge: 'bg-gray-100 text-gray-700' },
  { min: 5,  label: 'Bronze Citizen', icon: '🥉', color: 'from-orange-200 to-amber-400', badge: 'bg-orange-100 text-orange-700' },
  { min: 0,  label: 'Community Member', icon: '⭐', color: 'from-green-200 to-emerald-400', badge: 'bg-green-100 text-green-700' },
];

function getTier(points: number) {
  return TIER_CONFIG.find((t) => points >= t.min) ?? TIER_CONFIG[TIER_CONFIG.length - 1];
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500 fill-yellow-400" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400 fill-gray-300" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-amber-600 fill-amber-400" />;
  return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
}

function Avatar({ name, rank }: { name: string; rank: number }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const colors = [
    'from-emerald-400 to-teal-500',
    'from-blue-400 to-indigo-500',
    'from-purple-400 to-pink-500',
    'from-orange-400 to-red-500',
    'from-cyan-400 to-blue-500',
  ];
  const color = colors[(rank - 1) % colors.length];

  return (
    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${color} text-white font-bold text-sm shadow-md`}>
      {initials || '?'}
    </div>
  );
}

export default function LeaderboardPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  // Top 50 users by points
  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'), orderBy('points', 'desc'), limit(50));
  }, [firestore]);

  // All reports for stats calculation
  const reportsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'reports');
  }, [firestore]);

  const { data: users, isLoading: usersLoading } = useCollection<UserType>(usersQuery);
  const { data: reports, isLoading: reportsLoading } = useCollection<Report>(reportsQuery);

  const isLoading = usersLoading || reportsLoading;

  // Build enriched leaderboard entries
  const leaderboard = useMemo(() => {
    if (!users) return [];
    return users
      .filter((u) => u.role === 'citizen' && (u.points ?? 0) >= 0)
      .map((u, index) => {
        const userReports = reports?.filter((r) => r.userId === u.id) ?? [];
        const resolved = userReports.filter((r) => r.status === 'Resolved').length;
        const submitted = userReports.length;
        const tier = getTier(u.points ?? 0);
        return { ...u, rank: index + 1, resolved, submitted, tier };
      });
  }, [users, reports]);

  const myEntry = leaderboard.find((e) => e.id === user?.uid);

  // Top 3 for podium
  const podium = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="flex-1 space-y-5 p-4 md:p-6 pt-4 pb-8">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-600 p-6 text-white shadow-xl">
        <Button asChild variant="ghost" size="sm" className="mb-3 text-white/80 hover:text-white hover:bg-white/20 -ml-2 px-2">
          <Link href="/citizen/dashboard"><ArrowLeft className="mr-1 h-4 w-4" />Dashboard</Link>
        </Button>
        <div className="flex items-center gap-3">
          <Trophy className="h-9 w-9 fill-yellow-200 text-yellow-200 drop-shadow" />
          <div>
            <h1 className="text-2xl font-bold">Civic Leaderboard</h1>
            <p className="text-sm text-white/80">Top contributors making Pune better</p>
          </div>
        </div>

        {/* My rank callout */}
        {myEntry && (
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-white/20 px-4 py-3 backdrop-blur-sm">
            <span className="text-2xl">{myEntry.tier.icon}</span>
            <div className="flex-1">
              <p className="text-sm font-semibold">Your Rank: #{myEntry.rank}</p>
              <p className="text-xs text-white/80">{myEntry.points ?? 0} pts · {myEntry.tier.label}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/80">{myEntry.resolved} resolved</p>
              <p className="text-xs text-white/80">{myEntry.submitted} submitted</p>
            </div>
          </div>
        )}
      </div>

      {/* Tier legend */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {TIER_CONFIG.map((t) => (
          <span key={t.label} className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${t.badge}`}>
            {t.icon} {t.label}
          </span>
        ))}
      </div>

      {/* Podium – top 3 */}
      {!isLoading && podium.length >= 3 && (
        <div className="grid grid-cols-3 gap-3">
          {/* 2nd place */}
          <PodiumCard entry={podium[1]} position={2} />
          {/* 1st place */}
          <PodiumCard entry={podium[0]} position={1} highlight />
          {/* 3rd place */}
          <PodiumCard entry={podium[2]} position={3} />
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex items-center gap-3 rounded-xl border bg-white p-3">
              <Skeleton className="h-11 w-11 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {/* Ranks 4+ */}
      {!isLoading && rest.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Full Rankings</CardTitle>
            <CardDescription>All community contributors ranked by impact points</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5 px-3">
            {rest.map((entry) => {
              const isMe = entry.id === user?.uid;
              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                    isMe ? 'bg-orange-50 border border-orange-200' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                    {getRankIcon(entry.rank)}
                  </div>
                  <Avatar name={entry.name} rank={entry.rank} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-semibold">
                        {entry.name}{isMe && <span className="text-orange-500"> (You)</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1"><Flag className="h-3 w-3" />{entry.submitted}</span>
                      <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" />{entry.resolved}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-orange-600">{entry.points ?? 0}</p>
                    <p className="text-xs text-muted-foreground">pts</p>
                  </div>
                  <span className="hidden sm:inline text-base">{entry.tier.icon}</span>
                </div>
              );
            })}

            {leaderboard.length === 0 && (
              <div className="py-12 text-center">
                <Trophy className="mx-auto h-12 w-12 text-muted-foreground/30" />
                <p className="mt-3 text-sm font-medium text-muted-foreground">No contributors yet</p>
                <p className="text-xs text-muted-foreground">Be the first to submit a report!</p>
                <Button asChild size="sm" className="mt-4 bg-orange-500 hover:bg-orange-600 text-white">
                  <Link href="/citizen/report">Report an Issue</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* How points work */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm"><Flame className="h-4 w-4 text-orange-500" />How Points Work</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 text-xs">
          {[
            { action: 'Complaint resolved', pts: '+10 pts' },
            { action: 'AI-verified genuine', pts: '+5 pts bonus' },
            { action: '3 verified reports', pts: 'Coupon unlock' },
            { action: '5 verified reports', pts: 'Cashback unlock' },
          ].map((item) => (
            <div key={item.action} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 shadow-sm">
              <span className="text-muted-foreground">{item.action}</span>
              <span className="font-semibold text-orange-600">{item.pts}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function PodiumCard({
  entry,
  position,
  highlight = false,
}: {
  entry: { id: string; name: string; points?: number; rank: number; tier: ReturnType<typeof getTier> } | null | undefined;
  position: number;
  highlight?: boolean;
}) {
  if (!entry) return null;

  const podiumHeight = position === 1 ? 'pt-2' : position === 2 ? 'pt-6' : 'pt-10';
  const iconMap: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

  return (
    <div className={`flex flex-col items-center text-center ${podiumHeight}`}>
      <div className="text-2xl mb-1">{iconMap[position]}</div>
      <Avatar name={entry.name} rank={position} />
      <p className="mt-1.5 text-xs font-bold line-clamp-1 max-w-full px-1">{entry.name.split(' ')[0]}</p>
      <p className={`text-sm font-bold mt-0.5 ${highlight ? 'text-orange-600' : 'text-gray-700'}`}>
        {entry.points ?? 0} pts
      </p>
      <p className="text-xs text-muted-foreground">{entry.tier.icon}</p>
      <div className={`mt-1.5 w-full rounded-t-lg ${highlight ? 'bg-gradient-to-t from-amber-400 to-yellow-300 h-16' : 'bg-gradient-to-t from-gray-200 to-gray-100 h-10'} shadow-inner`} />
    </div>
  );
}
