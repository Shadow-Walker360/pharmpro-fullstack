import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Platform = 'desktop-installable' | 'android-installable' | 'ios-manual' | 'already-installed' | 'unsupported';

const DISMISS_STORAGE_KEY = 'pharmpro-install-dismissed-at';
const DISMISS_SNOOZE_DAYS = 7; // don't nag every single visit after a dismissal

function isStandaloneAlready(): boolean {
  // Covers Chrome/Edge/Android (display-mode: standalone) and iOS Safari
  // (navigator.standalone is the iOS-specific way of detecting the same thing).
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function wasRecentlyDismissed(): boolean {
  const raw = localStorage.getItem(DISMISS_STORAGE_KEY);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
  return daysSince < DISMISS_SNOOZE_DAYS;
}

export function useInstallPrompt() {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<Platform>('unsupported');
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (isStandaloneAlready()) {
      setPlatform('already-installed');
      return;
    }

    if (isIOS()) {
      setPlatform('ios-manual');
      setShowBanner(!wasRecentlyDismissed());
      return;
    }

    // Chrome/Edge/Android fire this event when their own installability
    // heuristics are satisfied (manifest + service worker + HTTPS, etc).
    // We intercept it so we can show our own banner instead of the
    // browser's default mini-infobar, then trigger the real prompt on tap.
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredEvent(e as BeforeInstallPromptEvent);
      setPlatform(/Android/i.test(navigator.userAgent) ? 'android-installable' : 'desktop-installable');
      setShowBanner(!wasRecentlyDismissed());
    };

    window.addEventListener('beforeinstallprompt', handler);

    const installedHandler = () => {
      setPlatform('already-installed');
      setShowBanner(false);
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredEvent) return { outcome: 'unavailable' as const };
    await deferredEvent.prompt();
    const { outcome } = await deferredEvent.userChoice;
    setShowBanner(false);
    setDeferredEvent(null);
    return { outcome };
  }, [deferredEvent]);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now()));
    setShowBanner(false);
  }, []);

  return { platform, showBanner, promptInstall, dismiss };
}
