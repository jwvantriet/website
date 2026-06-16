'use client';
/**
 * Re-opens the Cookiebot consent banner so visitors can change their
 * cookie preferences after the initial choice. Cookiebot exposes a
 * global `Cookiebot.renew()` once its uc.js script has loaded. No-ops if
 * Cookiebot isn't loaded yet (script still loading / blocked by a
 * content filter).
 *
 * Lives in its own client component so the Footer can stay a server
 * component — keeps the footer out of the client JS bundle.
 */
type CookiebotWindow = Window & { Cookiebot?: { renew?: () => void } };

export default function CookiePreferencesButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== 'undefined') {
          (window as CookiebotWindow).Cookiebot?.renew?.();
        }
      }}
      className={className}
    >
      Cookie Preferences
    </button>
  );
}
