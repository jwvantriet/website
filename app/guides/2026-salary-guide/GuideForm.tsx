'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Download, CheckCircle2 } from 'lucide-react';
import { requestGuide, type GuideFormState } from './actions';
import GuideContent from './GuideContent';
import SpamShieldFields from '@/components/SpamShieldFields';

const initialState: GuideFormState = { status: 'idle' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-yellow text-navy hover:bg-yellow-600 font-bold py-3 px-4 text-base rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? (
        'One moment...'
      ) : (
        <span className="flex items-center justify-center gap-2">
          <Download className="w-4 h-4" /> Get the Guide
        </span>
      )}
    </button>
  );
}

export default function GuideForm() {
  const [state, formAction] = useFormState(requestGuide, initialState);

  if (state.status === 'success') {
    return (
      <div>
        <div className="flex items-center gap-3 bg-emerald-50 text-emerald-700 rounded-xl px-5 py-4 mb-10">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">
            Thanks — the guide is unlocked below. Our team may reach out to see how we can help.
          </p>
        </div>
        <GuideContent />
      </div>
    );
  }

  return (
    <div className="bg-beige rounded-2xl p-8 md:p-10">
      <h3 className="text-2xl font-bold text-navy mb-2">Get the free guide</h3>
      <p className="text-navy-500 mb-8">
        Tell us where to attribute your copy and the full guide unlocks instantly.
      </p>

      <form action={formAction} className="space-y-5">
        <SpamShieldFields />
        <div>
          <label htmlFor="name" className="text-navy font-semibold text-sm mb-1.5 block">
            Full Name *
          </label>
          <input
            id="name"
            name="name"
            required
            placeholder="Your full name"
            className="w-full bg-white border border-gray-200 focus:border-cblue focus:ring-2 focus:ring-cblue/20 outline-none rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="email" className="text-navy font-semibold text-sm mb-1.5 block">
            Business Email *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@company.com"
            className="w-full bg-white border border-gray-200 focus:border-cblue focus:ring-2 focus:ring-cblue/20 outline-none rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="company" className="text-navy font-semibold text-sm mb-1.5 block">
            Company *
          </label>
          <input
            id="company"
            name="company"
            required
            placeholder="Your company"
            className="w-full bg-white border border-gray-200 focus:border-cblue focus:ring-2 focus:ring-cblue/20 outline-none rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="industry" className="text-navy font-semibold text-sm mb-1.5 block">
            Industry
          </label>
          <select
            id="industry"
            name="industry"
            defaultValue=""
            className="w-full bg-white border border-gray-200 focus:border-cblue focus:ring-2 focus:ring-cblue/20 outline-none rounded-md px-3 py-2 text-sm"
          >
            <option value="">Select industry</option>
            <option value="aviation">Aviation</option>
            <option value="maritime">Maritime</option>
            <option value="offshore">Offshore Energy</option>
            <option value="other">Other</option>
          </select>
        </div>

        {state.status === 'error' && <p className="text-red-600 text-sm">{state.message}</p>}

        <SubmitButton />
        <p className="text-navy-400 text-xs leading-relaxed">
          We use your details to send you the guide and relevant workforce insights. See our{' '}
          <a href="/privacy-policy" className="underline hover:text-navy">privacy policy</a>.
        </p>
      </form>
    </div>
  );
}
