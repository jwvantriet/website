'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Send, CheckCircle2, Building2, User } from 'lucide-react';
import { submitContactForm, type ContactFormState } from './actions';

const initialState: ContactFormState = { status: 'idle' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-[#fbc134] text-[#222c4a] hover:bg-[#e5af2e] font-bold py-3 px-4 text-base rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? (
        'Sending...'
      ) : (
        <span className="flex items-center justify-center gap-2">
          <Send className="w-4 h-4" /> Send Message
        </span>
      )}
    </button>
  );
}

export default function ContactForm() {
  const [state, formAction] = useFormState(submitContactForm, initialState);
  const [inquiryType, setInquiryType] = useState<'client' | 'candidate'>('client');
  const isCandidate = inquiryType === 'candidate';

  if (state.status === 'success') {
    return (
      <div className="bg-[#f2eee7] rounded-2xl p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-[#222c4a] mb-3">Thank You!</h3>
        <p className="text-[#5a6275] text-lg mb-6">
          Your message has been received. Our team will get back to you within 24 hours.
        </p>
        <a
          href="/contact"
          className="inline-block bg-[#222c4a] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#1a2340] transition-colors"
        >
          Send Another Message
        </a>
      </div>
    );
  }

  return (
    <div className="bg-[#f2eee7] rounded-2xl p-8 md:p-10">
      <h3 className="text-2xl font-bold text-[#222c4a] mb-2">Send Us a Message</h3>
      <p className="text-[#5a6275] mb-8">Fill out the form below and we&apos;ll respond promptly.</p>

      <div className="flex gap-3 mb-8">
        <button
          type="button"
          onClick={() => setInquiryType('client')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors ${
            !isCandidate ? 'bg-[#222c4a] text-white' : 'bg-white text-[#5a6275] hover:bg-gray-50'
          }`}
        >
          <Building2 className="w-4 h-4" /> I&apos;m a Client
        </button>
        <button
          type="button"
          onClick={() => setInquiryType('candidate')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors ${
            isCandidate ? 'bg-[#222c4a] text-white' : 'bg-white text-[#5a6275] hover:bg-gray-50'
          }`}
        >
          <User className="w-4 h-4" /> I&apos;m a Candidate
        </button>
      </div>

      <form action={formAction} className="space-y-5">
        <input type="hidden" name="inquiry_type" value={inquiryType} />

        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="name" className="text-[#222c4a] font-semibold text-sm mb-1.5 block">
              Full Name *
            </label>
            <input
              id="name"
              name="name"
              required
              placeholder="Your full name"
              className="w-full bg-white border border-gray-200 focus:border-[#407df1] focus:ring-2 focus:ring-[#407df1]/20 outline-none rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="email" className="text-[#222c4a] font-semibold text-sm mb-1.5 block">
              Email Address *
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="your@email.com"
              className="w-full bg-white border border-gray-200 focus:border-[#407df1] focus:ring-2 focus:ring-[#407df1]/20 outline-none rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>

        {!isCandidate ? (
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="company" className="text-[#222c4a] font-semibold text-sm mb-1.5 block">
                Company Name
              </label>
              <input
                id="company"
                name="company"
                placeholder="Your company"
                className="w-full bg-white border border-gray-200 focus:border-[#407df1] focus:ring-2 focus:ring-[#407df1]/20 outline-none rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="industry" className="text-[#222c4a] font-semibold text-sm mb-1.5 block">
                Industry
              </label>
              <select
                id="industry"
                name="industry"
                defaultValue=""
                className="w-full bg-white border border-gray-200 focus:border-[#407df1] focus:ring-2 focus:ring-[#407df1]/20 outline-none rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select industry</option>
                <option value="aviation">Aviation</option>
                <option value="maritime">Maritime</option>
                <option value="offshore">Offshore Energy</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        ) : (
          <div>
            <label htmlFor="field_of_expertise" className="text-[#222c4a] font-semibold text-sm mb-1.5 block">
              Field of Expertise
            </label>
            <select
              id="field_of_expertise"
              name="field_of_expertise"
              defaultValue=""
              className="w-full bg-white border border-gray-200 focus:border-[#407df1] focus:ring-2 focus:ring-[#407df1]/20 outline-none rounded-md px-3 py-2 text-sm"
            >
              <option value="">Select your field</option>
              <option value="aviation_engineering">Aviation Engineering</option>
              <option value="cabin_crew">Cabin Crew</option>
              <option value="ground_operations">Ground Operations</option>
              <option value="deck_officer">Deck Officer</option>
              <option value="marine_engineer">Marine Engineer</option>
              <option value="offshore_technician">Offshore Technician</option>
              <option value="hse_officer">HSE Officer</option>
              <option value="project_engineer">Project Engineer</option>
              <option value="other">Other</option>
            </select>
          </div>
        )}

        <div>
          <label htmlFor="message" className="text-[#222c4a] font-semibold text-sm mb-1.5 block">
            Message *
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={5}
            placeholder={
              isCandidate
                ? "Tell us about your experience, certifications, and what opportunities you're looking for..."
                : 'Describe your workforce requirements, timeline, and any specific certifications needed...'
            }
            className="w-full bg-white border border-gray-200 focus:border-[#407df1] focus:ring-2 focus:ring-[#407df1]/20 outline-none rounded-md px-3 py-2 text-sm resize-none"
          />
        </div>

        {state.status === 'error' && (
          <p className="text-red-600 text-sm">{state.message}</p>
        )}

        <SubmitButton />
      </form>
    </div>
  );
}
