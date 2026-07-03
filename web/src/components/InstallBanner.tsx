import { useInstallPrompt } from '../hooks/useInstallPrompt';

/**
 * Mount this once near the root of the app (e.g. in App.tsx, inside the
 * authenticated layout so it only shows to logged-in staff, not on the
 * public login screen). It renders nothing until the browser/OS says
 * installation is actually possible, and stays quiet for a week after
 * someone dismisses it.
 */
export function InstallBanner() {
  const { platform, showBanner, promptInstall, dismiss } = useInstallPrompt();

  if (!showBanner) return null;

  if (platform === 'ios-manual') {
    return (
      <div className="fixed bottom-4 inset-x-4 md:inset-x-auto md:right-4 md:w-96 z-50 bg-white border border-slate-200 rounded-xl shadow-lg p-4 flex gap-3">
        <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold shrink-0">
          Rx
        </div>
        <div className="flex-1">
          <p className="font-semibold text-slate-900 text-sm">Install PharmPro on your iPhone</p>
          <p className="text-sm text-slate-500 mt-1">
            Tap the <ShareIcon /> Share button, then <strong>&ldquo;Add to Home Screen&rdquo;</strong>.
          </p>
        </div>
        <button onClick={dismiss} className="text-slate-400 hover:text-slate-600 self-start" aria-label="Dismiss">
          ✕
        </button>
      </div>
    );
  }

  // desktop-installable or android-installable — real native prompt available
  return (
    <div className="fixed bottom-4 inset-x-4 md:inset-x-auto md:right-4 md:w-96 z-50 bg-white border border-slate-200 rounded-xl shadow-lg p-4 flex gap-3">
      <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold shrink-0">
        Rx
      </div>
      <div className="flex-1">
        <p className="font-semibold text-slate-900 text-sm">
          Install PharmPro {platform === 'android-installable' ? 'on your phone' : 'on this computer'}
        </p>
        <p className="text-sm text-slate-500 mt-1">
          Launch it like a regular app — faster access, works offline at the till.
        </p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={promptInstall}
            className="bg-teal-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-teal-700 transition"
          >
            Install
          </button>
          <button
            onClick={dismiss}
            className="text-slate-500 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-slate-50 transition"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg className="inline w-4 h-4 -mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v13m0-13 4 4m-4-4-4 4M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * ── Integration ──────────────────────────────────────────────────────────
 * In App.tsx, inside the authenticated route wrapper:
 *
 *   import { InstallBanner } from './components/InstallBanner';
 *   ...
 *   <AuthenticatedLayout>
 *     {children}
 *     <InstallBanner />
 *   </AuthenticatedLayout>
 *
 * Requires: manifest.json linked in index.html, sw.js registered (see
 * registerServiceWorker.ts), and the site served over HTTPS — Chrome/Edge
 * will not fire beforeinstallprompt on plain HTTP except on localhost.
 */
