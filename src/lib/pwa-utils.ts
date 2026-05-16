/**
 * PWA Utilities
 * Helper functions for PWA functionality
 */

/**
 * Check if app is running in standalone mode (installed PWA)
 */
export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

/**
 * Check if device is iOS
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

/**
 * Check if device supports beforeinstallprompt event (Android)
 */
export function supportsInstallPrompt(): boolean {
  if (typeof window === 'undefined') return false;
  
  return 'BeforeInstallPromptEvent' in window;
}

/**
 * Share data using Web Share API with fallback
 */
export async function shareContent(data: {
  title?: string;
  text?: string;
  url?: string;
}): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;
  
  if (navigator.share) {
    try {
      await navigator.share(data);
      return true;
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        // User cancelled, not an error
        return false;
      }
      console.error('Share failed:', err);
      return false;
    }
  }
  
  // Fallback to clipboard
  if (data.url && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(data.url);
      return true;
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      return false;
    }
  }
  
  return false;
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  
  if (Notification.permission === 'default') {
    return await Notification.requestPermission();
  }
  
  return Notification.permission;
}

/**
 * Show notification
 */
export function showNotification(title: string, options?: NotificationOptions): void {
  if ('Notification' in window && Notification.permission === 'granted') {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-96x96.png',
          ...options,
        });
      });
    } else {
      new Notification(title, {
        icon: '/icons/icon-192x192.png',
        ...options,
      });
    }
  }
}

/**
 * Vibrate device if supported
 */
export function vibrate(pattern: number | number[]): boolean {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return false;
  
  return navigator.vibrate(pattern);
}

/**
 * Get device info
 */
export function getDeviceInfo() {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isIOS: false,
      isAndroid: false,
      isPWA: false,
    };
  }
  
  const ua = navigator.userAgent;
  
  return {
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
    isIOS: /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream,
    isAndroid: /Android/i.test(ua),
    isPWA: isStandalonePWA(),
  };
}
