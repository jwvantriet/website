'use client';

import { useState } from 'react';

/**
 * Invisible anti-spam fields for the public lead forms. Pairs with
 * lib/spam.ts on the server:
 *
 * - "website" is a honeypot: visually hidden, skipped by keyboard focus and
 *   screen readers, but bots auto-fill it.
 * - "form_started_at" stamps when the form rendered so the server can reject
 *   inhumanly fast submissions.
 */
export default function SpamShieldFields() {
  const [startedAt] = useState(() => Date.now());
  return (
    <>
      <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <input type="hidden" name="form_started_at" value={startedAt} />
    </>
  );
}
