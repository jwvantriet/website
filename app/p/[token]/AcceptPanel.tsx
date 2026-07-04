'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { acceptProposal, type AcceptState } from './actions';

const initialState: AcceptState = { status: 'idle' };

const inputClass =
  'w-full bg-white border border-gray-200 focus:border-cblue focus:ring-2 focus:ring-cblue/20 outline-none rounded-md px-3 py-2 text-sm';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-yellow text-navy hover:bg-yellow-600 font-bold py-3 px-4 text-base rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? 'Recording your acceptance…' : 'Accept proposal'}
    </button>
  );
}

export default function AcceptPanel({ token }: { token: string }) {
  const [state, formAction] = useFormState(acceptProposal.bind(null, token), initialState);

  if (state.status === 'success') {
    return (
      <section id="accept" className="rounded-2xl bg-navy p-8 text-center">
        <h2 className="text-2xl font-bold text-white">Thank you — proposal accepted</h2>
        <p className="mx-auto mt-3 max-w-xl text-white/70">
          We&apos;ve recorded your acceptance and our team has been notified. You&apos;ll receive the
          framework agreement for signature shortly.
        </p>
      </section>
    );
  }

  return (
    <section id="accept" className="rounded-2xl bg-navy p-8 md:p-10">
      <h2 className="text-2xl font-bold text-white">Ready to proceed?</h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70">
        Accepting confirms your agreement to the commercial terms in this proposal, subject to
        signature of the framework agreement, which we will send for signature right away. Your
        acceptance is recorded with a timestamp.
      </p>
      <form action={formAction} className="mt-6 grid gap-4 sm:grid-cols-2">
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
        {state.status === 'error' && (
          <p className="sm:col-span-2 rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-200">
            {state.message}
          </p>
        )}
        <div className="sm:col-span-2">
          <SubmitButton />
        </div>
      </form>
    </section>
  );
}
