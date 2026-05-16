'use client';
import Link from 'next/link';
import { navItems } from '@/lib/nav-items';
import UserNav from './user-nav';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import LanguageSelector from '@/components/translation/language-selector';

export default function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        {/* Left side: Logo for all screens, Nav for desktop */}
        <div className="flex items-center">
          <Link href="/citizen/dashboard" className="mr-6 flex items-center space-x-2">
            <span className="font-bold sm:inline-block">Parivartan</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center space-x-6 text-sm font-medium md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'transition-colors hover:text-foreground/80',
                  pathname?.startsWith(item.href) ? 'text-foreground' : 'text-foreground/60'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right side: UserNav, pushed to the end by justify-between */}
        <div className="flex items-center gap-3">
          <UserNav />
          <LanguageSelector className="hidden sm:inline-flex" />
        </div>
      </div>
    </header>
  );
}
