'use client';

import { useEffect, useState } from 'react';
import { unstable_isUnrecognizedActionError } from 'next/navigation';

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
      return await action(prev, formData);
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
