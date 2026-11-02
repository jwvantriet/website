'use client';

import { useEffect, useState } from 'react';
import { unstable_isUnrecognizedActionError } from 'next/navigation';
import { track } from '@vercel/analytics';

/**
 * Recovery for a lead form whose Server Action no longer exists on the server.
 *
 * A page loaded before a deploy still holds the old build's action id. When
 * the visitor submits, the new build answers "Server action not found", Next's
 * client throws `UnrecognizedActionError`, and `useFormState` rethrows it into
 * the error boundary: a crash screen, and everything they typed is gone. The
 * submission never reaches Supabase, so nobody ever learns the lead existed.
 * That happened on /contact and the salary guide from 2026-10-27 onwards.
 *
 * `withStaleActionRecovery` catches exactly that error, keeps what the visitor
 * typed in sessionStorage and reloads onto the current build. A chosen file
 * cannot survive a reload, so only its field name is kept (`files`) and the
 * form asks for it again.
 * `useStaleActionRestore` reads it back after the reload, so the form shows
 * their answers again with a note to press send once more. It never
 * resubmits by itself: a person confirms, and nothing is sent twice.
 */

const PREFIX = 'stale-action:';

/*
 * Counting recoveries (Vercel Web Analytics custom events, production only):
 *   stale_action_restored    a visitor submitted from a page older than the
 *                            deploy, got the reload, and saw their form again
 *   stale_action_resubmitted that visitor then submitted successfully
 * Both fire in a browser running this page's JavaScript, so a bot posting the
 * form never counts: these are people. The server never sees a stale submit
 * from a real browser as an error (Next 15.5 answers it with an unlogged 404),
 * so before this nothing counted them at all. Only the form's kind is sent
 * ('contact', 'apply', 'upload', …), never a slug, a field or an id. The
 * first event is sent after the reload, not before it: a page about to reload
 * drops what it is still sending. Visitors who block analytics, or have not
 * given Cookiebot's statistics consent, are not counted, so these are a lower
 * bound and a ratio, not a total.
 */
const formKind = (key: string) => key.split(':')[0];
const restoredThisLoad = new Set<string>();

function count(event: 'stale_action_restored' | 'stale_action_resubmitted', key: string, tries = 20) {
  try {
    // track() is `window.va?.(…)`: called before <Analytics /> has set
    // window.va up, it is silently dropped, with no queue and no error. The
    // restore runs in the page's first effects, before the layout's
    // <Analytics /> mounts, so without this wait every restored event was
    // lost (caught in the browser test). Wait up to 5 s, then give up.
    if (!(window as { va?: unknown }).va) {
      if (tries > 0) setTimeout(() => count(event, key, tries - 1), 250);
      return;
    }
    track(event, { form: formKind(key) });
  } catch {
    // Analytics must never break the form.
  }
}

/** The form states that mean "it went through" across the wrapped forms. */
function succeeded(state: unknown): boolean {
  const status = (state as { status?: unknown } | null)?.status;
  return status === 'success' || status === 'sent';
}

/** Never saved: the honeypot must stay empty, the time-gate stamp is carried
 *  separately (see `startedAt`), and a session token is a credential that
 *  has no business in browser storage — the page renders it again anyway. */
const SKIP = new Set(['website', 'form_started_at', 'session_token']);

export type RestoredForm = {
  /** Visible field values by input name. */
  fields: Record<string, string>;
  /** The original `form_started_at`. Re-stamping on reload would put a
   *  visitor who presses send within 3 s of the reload under lib/spam.ts's
   *  MIN_FILL_MS gate, where the lead is dropped while they are told it was
   *  sent. They filled the form in before the reload, so the first stamp is
   *  the true one. */
  startedAt: number | null;
  /** Names of file inputs that held a file. The file itself is lost with
   *  the reload, so the form has to ask for it again. */
  files: string[];
};

export function withStaleActionRecovery<S>(
  key: string,
  action: (prev: S, formData: FormData) => Promise<S>,
  options: {
    /** Save only these text fields (default: every text field not in SKIP). */
    only?: string[];
    /** Values that are not form fields (e.g. an action's bound arguments)
     *  but are needed to put the page back where it was. */
    extra?: Record<string, string>;
  } = {},
): (prev: S, formData: FormData) => Promise<S> {
  const only = options.only ? new Set(options.only) : null;
  return async (prev, formData) => {
    try {
      const result = await action(prev, formData);
      if (restoredThisLoad.has(key) && succeeded(result)) {
        restoredThisLoad.delete(key);
        count('stale_action_resubmitted', key);
      }
      return result;
    } catch (err) {
      if (!unstable_isUnrecognizedActionError(err)) throw err;

      const fields: Record<string, string> = {};
      const files: string[] = [];
      formData.forEach((value, name) => {
        if (typeof value !== 'string') {
          if (value.size > 0) files.push(name);
        } else if (!SKIP.has(name) && (!only || only.has(name))) {
          fields[name] = value;
        }
      });
      Object.assign(fields, options.extra);
      const startedAt = Number(formData.get('form_started_at'));
      const saved: RestoredForm = {
        fields,
        startedAt: Number.isFinite(startedAt) && startedAt > 0 ? startedAt : null,
        files,
      };
      try {
        sessionStorage.setItem(PREFIX + key, JSON.stringify(saved));
      } catch {
        // Storage blocked (private mode, quota): reloading would throw their
        // text away, so rethrow and let the error boundary show instead.
        throw err;
      }
      window.location.reload();
      // Keep the button in its pending state until the reload replaces the page.
      return new Promise<S>(() => {});
    }
  };
}

/** The form saved before a stale-action reload, or null. Read once, then
 *  cleared, so a later visit to the page starts empty. */
export function useStaleActionRestore(key: string): RestoredForm | null {
  const [restored, setRestored] = useState<RestoredForm | null>(null);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PREFIX + key);
      if (!raw) return;
      sessionStorage.removeItem(PREFIX + key);
      const parsed = JSON.parse(raw) as RestoredForm;
      if (parsed && typeof parsed.fields === 'object') {
        setRestored({ ...parsed, files: Array.isArray(parsed.files) ? parsed.files : [] });
        restoredThisLoad.add(key);
        count('stale_action_restored', key);
      }
    } catch {
      // Unreadable or blocked storage: show the empty form.
    }
  }, [key]);
  return restored;
}

export const STALE_ACTION_NOTICE =
  'The site was updated while this page was open, so your form was not sent yet. ' +
  'We kept what you typed. Check it and submit again.';
