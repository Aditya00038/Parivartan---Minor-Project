'use client';

import { useEffect, useState } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already in PWA mode
    const isInStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                          (window.navigator as any).standalone === true;
    setIsStandalone(isInStandalone);

    // Check if user has chosen not to see prompt again (permanently)
    const hidePrompt = localStorage.getItem('smc-pwa-hide-prompt') === 'true';
    
    // Check if user clicked "Maybe Later" (temporary hide for 24 hours)
    const hideUntil = localStorage.getItem('smc-pwa-hide-until');
    const isTemporarilyHidden = hideUntil && Date.now() < parseInt(hideUntil);
    
    if (isInStandalone || hidePrompt || isTemporarilyHidden) {
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after 3-4 seconds
      setTimeout(() => {
        setShowPrompt(true);
      }, 3500);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }

    // Clear the deferredPrompt for reuse
    setDeferredPrompt(null);
    setShowPrompt(false);

    // Save preference if checkbox is checked
    if (dontShowAgain) {
      localStorage.setItem('smc-pwa-hide-prompt', 'true');
    }
  };

  const handleClose = () => {
    setShowPrompt(false);
    
    // Save preference if checkbox is checked (permanently) or "Maybe Later" (for 24 hours)
    if (dontShowAgain) {
      localStorage.setItem('smc-pwa-hide-prompt', 'true');
    } else {
      // Hide for 24 hours when clicking "Maybe Later"
      const hideUntil = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
      localStorage.setItem('smc-pwa-hide-until', hideUntil.toString());
    }
  };

  // Don't render if already in PWA mode or should be hidden
  if (isStandalone || !showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300 md:items-center">
      <Card className="relative w-full max-w-md m-4 p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 md:slide-in-from-bottom-0">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="flex flex-col items-center text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Smartphone className="h-8 w-8 text-primary" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold">Install SMC Road App</h3>
            <p className="text-sm text-muted-foreground">
              Get quick access to report road damage and track complaints. Install our app for a better experience!
            </p>
          </div>

          <div className="w-full space-y-3">
            <Button 
              onClick={handleInstallClick} 
              className="w-full gap-2"
              size="lg"
            >
              <Download className="h-5 w-5" />
              Install Now
            </Button>

            <div className="flex items-center space-x-2 justify-center">
              <Checkbox
                id="dont-show"
                checked={dontShowAgain}
                onCheckedChange={(checked) => setDontShowAgain(checked === true)}
              />
            </div>

            <Button 
              onClick={handleClose} 
              variant="ghost"
              className="w-full"
            >
              Maybe Later
            </Button>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
            <div className="flex items-center gap-1">
              ✓ Works offline
            </div>
            <div className="flex items-center gap-1">
              ✓ Fast & reliable
            </div>
            <div className="flex items-center gap-1">
              ✓ Native feel
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
