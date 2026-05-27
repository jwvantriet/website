'use client';
/**
 * Re-opens the Termly consent banner so visitors can change their
 * cookie preferences after the initial choice. Termly exposes a
 * `displayPreferenceModal()` global once its resource-blocker script
 * has loaded. No-ops if Termly isn't loaded (env var unset / blocked
 * by a content filter).
 *
 * Lives in its own client component so the Footer can stay a server
 * component — keeps the footer out of the client JS bundle.
 */
type TermlyWindow = Window & { displayPreferenceModal?: () => void };

export default function CookiePreferencesButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== 'undefined') {
          (window as TermlyWindow).displayPreferenceModal?.();
        }
      }}
      className={className}
    >
      Cookie Preferences
    </button>
  );
}
