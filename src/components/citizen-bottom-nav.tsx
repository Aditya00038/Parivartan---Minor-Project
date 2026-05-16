'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, FileText, Plus, Trophy, Bell } from 'lucide-react';

const bottomNavItems = [
  { href: '/citizen/dashboard',       label: 'Home',      icon: Home     },
  { href: '/citizen/my-complaints',   label: 'Reports',   icon: FileText },
  { href: '/citizen/report',          label: 'Report',    icon: Plus,    accent: true },
  { href: '/citizen/leaderboard',     label: 'Ranks',     icon: Trophy   },
  { href: '/citizen/notifications',   label: 'Alerts',    icon: Bell     },
];

export default function CitizenBottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full md:hidden">
      <div className="bg-white border-t border-gray-100 shadow-2xl rounded-t-2xl">
        <div className="flex h-16 items-center justify-between px-2 max-w-md mx-auto">
          {bottomNavItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            if (item.accent) {
              return (
                <Link key={item.href} href={item.href} className="flex flex-col items-center -mt-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-200">
                    <Icon className="h-5 w-5 text-white" strokeWidth={2.5} />
                  </div>
                  <span className="text-[9px] font-medium text-emerald-600 mt-0.5">{item.label}</span>
                </Link>
              );
            }
            return (
              <Link key={item.href} href={item.href} className="flex flex-1 flex-col items-center gap-1 py-1">
                <div className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-xl transition-all',
                  isActive ? 'bg-emerald-50 text-emerald-600' : 'text-gray-400 hover:text-gray-600'
                )}>
                  <Icon className="h-4 w-4" strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={cn(
                  'text-[9px] font-medium leading-none',
                  isActive ? 'text-emerald-600' : 'text-gray-400'
                )}>{item.label}</span>
              </Link>
            );
          })}
        </div>
        {/* Safe area spacer */}
        <div className="h-safe-area-inset-bottom bg-white" />
      </div>
    </div>
  );
}
