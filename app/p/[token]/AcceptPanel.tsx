'use client';

import { useFormState, useFormStatus } from 'react-dom';
import {
  startSignature,
  verifySignature,
  type StartState,
  type VerifyState,
} from './actions';

const initialStart: StartState = { status: 'idle' };
const initialVerify: VerifyState = { status: 'idle' };

const inputClass =
  'w-full bg-white border border-gray-200 focus:border-cblue focus:ring-2 focus:ring-cblue/20 outline-none rounded-md px-3 py-2 text-sm';

function SubmitButton({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-yellow text-navy hover:bg-yellow-600 font-bold py-3 px-4 text-base rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? busy : idle}
    </button>
  );
}

export default function AcceptPanel({ token }: { token: string }) {
  const [startState, startAction] = useFormState(startSignature.bind(null, token), initialStart);
  const sent = startState.status === 'sent';

  const [verifyState, verifyAction] = useFormState(
    verifySignature.bind(
      null,
      token,
      sent ? startState.challengeId : '',
      sent ? startState.email : '',
    ),
    initialVerify,
  );

  // --- Signed -------------------------------------------------------------
  if (verifyState.status === 'success') {
    return (
      <section id="accept" className="rounded-2xl bg-navy p-8 text-center">
        <h2 className="text-2xl font-bold text-white">Thank you — proposal signed</h2>
        <p className="mx-auto mt-3 max-w-xl text-white/70">
          We&apos;ve recorded your acceptance with a verified timestamp and notified our team.
          You&apos;ll receive the framework agreement for signature shortly.
        </p>
        <a
          href={`/p/${token}/certificate`}
          className="mt-6 inline-block rounded-lg bg-yellow px-6 py-3 text-sm font-bold text-navy transition-colors hover:bg-yellow-600"
        >
          View signing certificate
        </a>
      </section>
    );
  }

  // --- Step 2: verify the one-time code -----------------------------------
  if (sent) {
    return (
      <section id="accept" className="rounded-2xl bg-navy p-8 md:p-10">
        <h2 className="text-2xl font-bold text-white">Verify it&apos;s you</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70">
          We&apos;ve emailed a 6-digit code to <span className="font-semibold text-white">{startState.email}</span>.
          Enter it below to sign and confirm your acceptance of the commercial terms.
        </p>
        <form action={verifyAction} className="mt-6 max-w-xs">
          <label htmlFor="sign-code" className="mb-1 block text-xs font-semibold text-white/80">
            6-digit code *
          </label>
          <input
            id="sign-code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            className={`${inputClass} tracking-[0.5em] text-center text-lg font-semibold`}
          />
          {verifyState.status === 'error' && (
            <p className="mt-3 rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-200">
              {verifyState.message}
            </p>
          )}
          <div className="mt-4">
            <SubmitButton idle="Sign &amp; accept" busy="Recording your signature…" />
          </div>
        </form>
        <p className="mt-4 text-xs text-white/50">
          Didn&apos;t get the code? Check spam, or reload this page to request a new one.
        </p>
      </section>
    );
  }

  // --- Step 1: signer details + consent -----------------------------------
  return (
    <section id="accept" className="rounded-2xl bg-navy p-8 md:p-10">
      <h2 className="text-2xl font-bold text-white">Ready to proceed?</h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70">
        Accepting confirms your agreement to the commercial terms in this proposal, subject to
        signature of the framework agreement, which we will send right away. To verify your
        identity we&apos;ll email you a one-time code; your signature is recorded with a timestamp.
      </p>
      <form action={startAction} className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="accept-name" className="mb-1 block text-xs font-semibold text-white/80">
            Full name *
          </label>
          <input id="accept-name" name="name" required autoComplete="name" className={inputClass} />
        </div>
        <div>
          <label htmlFor="accept-title" className="mb-1 block text-xs font-semibold text-white/80">
            Job title
          </label>
          <input id="accept-title" name="title" autoComplete="organization-title" className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="accept-email" className="mb-1 block text-xs font-semibold text-white/80">
            Business email *
          </label>
          <input id="accept-email" name="email" type="email" required autoComplete="email" className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="accept-note" className="mb-1 block text-xs font-semibold text-white/80">
            Message (optional)
          </label>
          <textarea id="accept-note" name="note" rows={3} className={inputClass} />
        </div>
        <label className="sm:col-span-2 flex items-start gap-3 text-sm text-white/80">
          <input
            type="checkbox"
            name="consent"
            required
            className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-cblue focus:ring-cblue"
          />
          <span>
            I confirm I am authorised to accept these commercial terms on behalf of the client
            named in this proposal.
          </span>
        </label>
        {startState.status === 'error' && (
          <p className="sm:col-span-2 rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-200">
            {startState.message}
          </p>
        )}
        <div className="sm:col-span-2">
          <SubmitButton idle="Send verification code" busy="Sending code…" />
        </div>
      </form>
    </section>
  );
}
