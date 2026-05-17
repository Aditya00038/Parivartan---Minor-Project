'use client';

import { Filter, MapPin, X, Layers } from 'lucide-react';
import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, DocumentData, Query } from 'firebase/firestore';
import type { Report } from '@/lib/types';
import { useFirestore } from '@/firebase/provider';
import { Skeleton } from '@/components/ui/skeleton';

// Dynamically import HeatMap to avoid SSR issues with Leaflet
const HeatMap = dynamic(() => import('@/components/heat-map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-100 animate-pulse rounded-xl flex items-center justify-center">
      <p className="text-sm text-slate-400 font-medium">Loading map…</p>
    </div>
  ),
});

// Non-completed statuses only
const ACTIVE_STATUSES = ['Submitted', 'Under Verification', 'Assigned', 'In Progress'];

// Category colour palette (matches heat-map.tsx CATEGORY_COLORS)
const CATEGORY_COLORS: Record<string, string> = {
  Garbage:           '#f59e0b',
  'Road Damage':     '#ef4444',
  'Water Supply':    '#3b82f6',
  Electrical:        '#8b5cf6',
  Sewage:            '#10b981',
  'Tree / Garden':   '#22c55e',
  Encroachment:      '#f97316',
  Noise:             '#ec4899',
  Other:             '#6b7280',
};

function categoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? '#6366f1';
}

export default function SmcDashboard() {
  const firestore = useFirestore();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const allReportsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'reports'), orderBy('timestamp', 'desc'));
  }, [firestore]) as Query<DocumentData> | null;

  const { data: rawReports, isLoading } = useCollection<Report>(allReportsQuery);

  // Only show active (non-completed) reports on the map
  const activeReports = useMemo(
    () => (rawReports ?? []).filter(r => ACTIVE_STATUSES.includes(r.status)),
    [rawReports],
  );

  const uniqueCategories = useMemo(() => {
    const cats = new Set(activeReports.map(r => r.category).filter(Boolean) as string[]);
    return Array.from(cats).sort();
  }, [activeReports]);

  const heatMapData = useMemo(() =>
    activeReports
      .filter(r => r.latitude && r.longitude)
      .map(r => ({
        lat:         r.latitude!,
        lng:         r.longitude!,
        location:    r.location || 'Unknown Location',
        status:      r.status,
        type:        r.category,
        category:    r.category,
        department:  r.department,
        reportId:    r.id,
        imageUrl:    r.imageUrl,
        description: r.description,
        priority:    r.priority,
        date:        new Date(r.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        count:       1,
      })),
    [activeReports],
  );

  const toggleCategory = (cat: string) =>
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat],
    );

  const clearFilters = () => setSelectedCategories([]);

  const visibleCount = selectedCategories.length === 0
    ? heatMapData.length
    : heatMapData.filter(d => selectedCategories.includes(d.category ?? '')).length;

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 p-5 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-6 left-16 h-28 w-28 rounded-full bg-indigo-500/20 blur-xl" />

        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50 mb-1">SMC Admin</p>
        <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
          <MapPin className="h-5 w-5 text-indigo-400" />
          Live Report Map
        </h1>
        <p className="text-sm text-white/60 mt-1">
          Active civic reports across Pune — Resolved &amp; Rejected issues are hidden
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { label: 'Active Reports', value: heatMapData.length,   color: 'bg-indigo-500/20 border-indigo-400/30 text-indigo-200' },
            { label: 'Showing',        value: visibleCount,          color: 'bg-white/10      border-white/20      text-white'       },
            { label: 'Categories',     value: uniqueCategories.length, color: 'bg-amber-500/20  border-amber-400/30  text-amber-200' },
          ].map(s => (
            <div key={s.label} className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 ${s.color}`}>
              <span className="text-lg font-black leading-none">{s.value}</span>
              <span className="text-[11px] font-medium opacity-80">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Filter className="h-4 w-4 text-slate-400" />
            Filter by Category
            {selectedCategories.length > 0 && (
              <Badge className="ml-1 bg-indigo-100 text-indigo-700 text-[11px]">
                {selectedCategories.length} active
              </Badge>
            )}
          </div>
          {selectedCategories.length > 0 && (
            <Button
              onClick={clearFilters}
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-slate-500 hover:text-slate-700 gap-1 px-2"
            >
              <X className="h-3 w-3" />
              Clear
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {isLoading ? (
            [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-8 w-24 rounded-full" />)
          ) : uniqueCategories.length === 0 ? (
            <span className="text-xs text-slate-400">No active categories</span>
          ) : (
            uniqueCategories.map(cat => {
              const active = selectedCategories.includes(cat);
              const color  = categoryColor(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-all ${
                    active
                      ? 'text-white shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                  style={active ? { backgroundColor: color, borderColor: color } : {}}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: active ? 'rgba(255,255,255,0.7)' : color }}
                  />
                  {cat}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Map ──────────────────────────────────────────────────────────── */}
      <div className="relative w-full h-[680px] rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-slate-50">
        {isLoading ? (
          <Skeleton className="w-full h-full rounded-2xl" />
        ) : (
          <div className="w-full h-full">
            <HeatMap
              data={heatMapData}
              selectedCategories={selectedCategories}
              selectedStatuses={[]}
            />
          </div>
        )}

        {/* floating badge */}
        {!isLoading && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[999] pointer-events-none">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-sm border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
              <Layers className="h-3 w-3 text-indigo-500" />
              {visibleCount} report{visibleCount !== 1 ? 's' : ''} on map
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
