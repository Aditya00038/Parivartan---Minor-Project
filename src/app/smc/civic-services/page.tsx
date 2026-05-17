'use client';

import { useState } from 'react';
import { collection, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { CheckCircle, XCircle, MapPin, Clock, User, Filter } from 'lucide-react';
import Image from 'next/image';
import { useFirestore, useMemoFirebase, useCollection, useUser } from '@/firebase';
import type { CivicService, CivicServiceStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { CATEGORIES } from '@/components/maps/nearby-services-map';
import type { CivicServiceCategory } from '@/lib/types';

const STATUS_COLORS: Record<CivicServiceStatus, string> = {
  pending:  'bg-amber-100 text-amber-700 border-amber-300',
  approved: 'bg-green-100 text-green-700 border-green-300',
  rejected: 'bg-red-100 text-red-700 border-red-300',
};

type FilterTab = 'pending' | 'approved' | 'rejected' | 'all';

export default function CivicServicesAdminPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [tab, setTab] = useState<FilterTab>('pending');
  const [processing, setProcessing] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<Record<string, string>>({});

  const servicesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'civic_services'), orderBy('submittedAt', 'desc'));
  }, [firestore]);

  const { data: allServices, isLoading } = useCollection<CivicService>(servicesQuery);

  const filtered = (allServices ?? []).filter(s =>
    tab === 'all' ? true : s.status === tab
  );

  const counts = {
    pending:  (allServices ?? []).filter(s => s.status === 'pending').length,
    approved: (allServices ?? []).filter(s => s.status === 'approved').length,
    rejected: (allServices ?? []).filter(s => s.status === 'rejected').length,
    all:      (allServices ?? []).length,
  };

  const handleDecision = async (service: CivicService, decision: 'approved' | 'rejected') => {
    if (!firestore || !user) return;
    setProcessing(service.id);
    try {
      const updateData: Record<string, string> = {
        status: decision,
        reviewedBy: user.uid,
        reviewedAt: new Date().toISOString(),
      };
      // If approving, save the name the admin typed (fall back to category label)
      if (decision === 'approved') {
        const adminName = editingName[service.id]?.trim();
        if (adminName) updateData.name = adminName;
        else updateData.name = CATEGORIES[service.category]?.label ?? service.category;
      }
      await updateDoc(doc(firestore, 'civic_services', service.id), updateData);
      toast({
        title: decision === 'approved' ? 'Service approved' : 'Service rejected',
        description: `"${service.name}" has been ${decision}.`,
      });
    } catch {
      toast({ variant: 'destructive', title: 'Action failed', description: 'Please try again.' });
    } finally {
      setProcessing(null);
    }
  };

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'pending',  label: 'Pending'  },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'all',      label: 'All'      },
  ];

  return (
    <div className="flex-1 p-4 md:p-6 pb-8 space-y-4">

      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-teal-700 to-emerald-800 p-5 text-white shadow-md">
        <p className="text-xs font-medium text-white/60 uppercase tracking-widest mb-1">Admin</p>
        <h1 className="text-xl font-bold tracking-tight">Civic Service Registrations</h1>
        <p className="text-sm text-white/65 mt-0.5">Review and approve citizen-submitted service locations</p>
        <div className="mt-3 flex gap-3">
          {[
            { label: 'Pending',  value: counts.pending,  color: 'bg-amber-400/20 text-amber-200' },
            { label: 'Approved', value: counts.approved, color: 'bg-green-400/20 text-green-200' },
            { label: 'Rejected', value: counts.rejected, color: 'bg-red-400/20 text-red-200'     },
          ].map(s => (
            <div key={s.label} className={`rounded-xl px-3 py-1.5 text-center ${s.color}`}>
              <p className="text-lg font-bold leading-none">{s.value}</p>
              <p className="text-[10px] font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              tab === t.key
                ? 'bg-white shadow text-slate-900'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
            <span className={`rounded-full px-1.5 text-[10px] font-bold ${
              tab === t.key ? 'bg-slate-100 text-slate-600' : 'bg-slate-200 text-slate-500'
            }`}>
              {counts[t.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
        </div>
      )}

      {/* Empty */}
      {!isLoading && filtered.length === 0 && (
        <div className="py-16 text-center">
          <Filter className="mx-auto h-10 w-10 text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-500">No {tab === 'all' ? '' : tab} submissions</p>
          <p className="text-xs text-slate-400 mt-1">
            {tab === 'pending' ? 'All caught up — no pending reviews.' : 'Nothing here yet.'}
          </p>
        </div>
      )}

      {/* Cards */}
      <div className="space-y-3">
        {filtered.map(service => {
          const cat = CATEGORIES[service.category];
          const isProcessing = processing === service.id;

          return (
            <Card key={service.id} className="border border-slate-100 shadow-none overflow-hidden">
              {/* Photo */}
              {service.imageUrl && (
                <div className="relative w-full h-44">
                  <Image
                    src={service.imageUrl}
                    alt={service.name}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-2 left-2">
                    <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_COLORS[service.status]}`}>
                      {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                    </span>
                  </div>
                </div>
              )}

              <CardContent className="p-4 space-y-3">
                {/* Category + name */}
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                    {(() => { const cfg = CATEGORIES[service.category]; return <cfg.Icon className={`h-5 w-5`} style={{ color: cfg.pinBg }} strokeWidth={2} />; })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold leading-tight">{service.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{cat.label}</p>
                  </div>
                </div>

                {/* Meta */}
                <div className="space-y-1.5 text-xs text-slate-500">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" />
                    <span className="line-clamp-2">{service.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span>Submitted by {service.submittedByName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span>{new Date(service.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <a
                      href={`https://www.google.com/maps?q=${service.latitude},${service.longitude}`}
                      target="_blank"
                      rel="noopener"
                      className="text-emerald-600 hover:underline"
                    >
                      {service.latitude.toFixed(5)}, {service.longitude.toFixed(5)} — View on map
                    </a>
                  </div>
                </div>

                {/* Actions — only for pending */}
                {service.status === 'pending' && (
                  <div className="space-y-2 pt-1">
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1">
                        Service Name <span className="text-slate-400">(required to approve)</span>
                      </label>
                      <input
                        type="text"
                        value={editingName[service.id] ?? ''}
                        onChange={(e) => setEditingName(prev => ({ ...prev, [service.id]: e.target.value }))}
                        placeholder={`e.g. Dhanori ${CATEGORIES[service.category]?.label}`}
                        className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleDecision(service, 'approved')}
                        disabled={isProcessing || !(editingName[service.id]?.trim())}
                        className="flex-1 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                      >
                        <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                        {isProcessing ? 'Processing…' : 'Approve'}
                      </Button>
                      <Button
                        onClick={() => handleDecision(service, 'rejected')}
                        disabled={isProcessing}
                        variant="outline"
                        className="flex-1 h-9 rounded-xl border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold"
                      >
                        <XCircle className="mr-1.5 h-3.5 w-3.5" />
                        Reject
                      </Button>
                    </div>
                  </div>
                )}

                {/* Reviewed info */}
                {service.status !== 'pending' && service.reviewedAt && (
                  <p className="text-[11px] text-slate-400">
                    {service.status === 'approved' ? 'Approved' : 'Rejected'} on{' '}
                    {new Date(service.reviewedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
