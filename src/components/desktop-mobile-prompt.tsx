'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Smartphone, Monitor, X, QrCode } from 'lucide-react';

interface DesktopMobilePromptProps {
  variant?: 'citizen' | 'worker';
}

export function DesktopMobilePrompt({ variant = 'citizen' }: DesktopMobilePromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // Check if running on desktop
    const checkIsDesktop = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(userAgent);
      const isTablet = /ipad|tablet|playbook|silk/i.test(userAgent);
      const isSmallScreen = window.innerWidth < 768;
      
      return !isMobile && !isTablet && !isSmallScreen;
    };

    const desktop = checkIsDesktop();
    setIsDesktop(desktop);

    // Check if prompt has been dismissed before
    const dismissed = localStorage.getItem('desktop-mobile-prompt-dismissed');
    const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0;
    const hoursSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60);

    // Show prompt if on desktop and not dismissed in last 24 hours
    if (desktop && hoursSinceDismissed > 24) {
      // Delay showing the prompt
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('desktop-mobile-prompt-dismissed', Date.now().toString());
    setShowPrompt(false);
  };

  const handleDontShowAgain = () => {
    localStorage.setItem('desktop-mobile-prompt-dismissed', (Date.now() + 365 * 24 * 60 * 60 * 1000).toString());
    setShowPrompt(false);
  };

  if (!isDesktop || !showPrompt) return null;

  const colorClasses = variant === 'citizen' 
    ? 'from-emerald-500 to-green-600' 
    : 'from-orange-500 to-amber-600';

  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className={`p-4 rounded-full bg-gradient-to-br ${colorClasses} shadow-lg`}>
              <Smartphone className="h-8 w-8 text-white" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">Better Experience on Mobile!</DialogTitle>
          <DialogDescription className="text-center">
            Parivartan is optimized for mobile devices. Install our app on your phone for the best experience.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
            <Monitor className="h-10 w-10 text-gray-400" />
            <div className="flex-1">
              <p className="font-medium text-gray-900">You&apos;re on Desktop</p>
              <p className="text-sm text-gray-500">Some features work better on mobile</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-xl border-2 border-emerald-200">
            <Smartphone className="h-10 w-10 text-emerald-600" />
            <div className="flex-1">
              <p className="font-medium text-gray-900">Use on Mobile</p>
              <p className="text-sm text-gray-500">Camera, GPS, and notifications work best</p>
            </div>
          </div>

          <div className="text-center p-4 bg-gray-100 rounded-xl">
            <p className="text-sm text-gray-600 mb-2">Open this link on your phone:</p>
            <code className="text-xs bg-white px-3 py-2 rounded-lg border block overflow-x-auto">
              {appUrl}
            </code>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleDontShowAgain} className="w-full sm:w-auto">
            Don&apos;t show again
          </Button>
          <Button onClick={handleDismiss} className={`w-full sm:w-auto bg-gradient-to-r ${colorClasses} text-white`}>
            Continue on Desktop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
