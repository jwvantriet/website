import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ unstable_isUnrecognizedActionError: () => false }));
vi.mock('@vercel/analytics', () => ({ track: () => {} }));

const { recoverableSubmitError } = await import('@/lib/stale-action');

const never = () => false;

describe('recoverableSubmitError', () => {
  it('an outdated page (unrecognised action) is stale', () => {
    expect(recoverableSubmitError(new Error('x'), () => true)).toBe('stale');
  });

  it("Next's unexpected-response error keeps the form (2026-11-10, /industries/aviation)", () => {
    expect(recoverableSubmitError(new Error('An unexpected response was received from the server.'), never)).toBe('failed');
  });

  it('browser network failures keep the form', () => {
    for (const m of ['Failed to fetch', 'Load failed', 'NetworkError when attempting to fetch resource.']) {
      expect(recoverableSubmitError(new TypeError(m), never)).toBe('failed');
    }
  });

  it('any other error still goes to the error boundary', () => {
    expect(recoverableSubmitError(new Error('Failed to fetch'), never)).toBeNull();   // not a TypeError
    expect(recoverableSubmitError(new TypeError('x is undefined'), never)).toBeNull();
    expect(recoverableSubmitError('An unexpected response was received from the server.', never)).toBeNull();
    expect(recoverableSubmitError(null, never)).toBeNull();
  });
});
