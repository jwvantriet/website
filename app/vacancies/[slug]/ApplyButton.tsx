'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import {
  X,
  Upload,
  CheckCircle2,
  Loader2,
  FileText,
  User,
  Mail,
  Phone,
  MessageSquare,
  Briefcase,
} from 'lucide-react';
import { submitVacancyApplication, type ApplyFormState } from './apply-action';

interface ApplyButtonProps {
  vacancyId: number;
  vacancySlug: string;
  vacancyTitle: string;
  vacancyCarerixId: string | null;
  variant?: 'top' | 'bottom';
}

const initialState: ApplyFormState = { status: 'idle' };
const MAX_CV_BYTES = 5 * 1024 * 1024;
const ALLOWED_CV_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export default function ApplyButton({
  vacancyId,
  vacancySlug,
  vacancyTitle,
  vacancyCarerixId,
  variant = 'top',
}: ApplyButtonProps) {
  const [open, setOpen] = useState(false);
  const subline =
    variant === 'top'
      ? 'Ready to advance your career? Apply now for this opportunity.'
      : "Don't miss this opportunity. Apply today.";

  return (
    <>
      <div className="bg-[#222c4a] rounded-2xl p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-[#fbc134] text-sm font-semibold uppercase tracking-wider mb-1">
            Take the next step
          </p>
          <p className="text-white/70 text-sm">{subline}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex-shrink-0 bg-[#fbc134] text-[#222c4a] px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-[#f0b020] transition-colors shadow-lg shadow-[#fbc134]/20"
        >
          Apply for this job
        </button>
      </div>

      {open && (
        <ApplyDialog
          vacancyId={vacancyId}
          vacancySlug={vacancySlug}
          vacancyTitle={vacancyTitle}
          vacancyCarerixId={vacancyCarerixId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function ApplyDialog({
  vacancyId,
  vacancySlug,
  vacancyTitle,
  vacancyCarerixId,
  onClose,
}: Omit<ApplyButtonProps, 'variant'> & { onClose: () => void }) {
  const [state, formAction] = useFormState(submitVacancyApplication, initialState);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef    = useRef<HTMLDivElement>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setClientError(null);
    const file = e.target.files?.[0] ?? null;
    if (!file) { setCvFile(null); return; }
    if (file.size > MAX_CV_BYTES) {
      setClientError('CV must be under 5 MB.');
      setCvFile(null);
      e.target.value = '';
      return;
    }
    if (file.type && !ALLOWED_CV_TYPES.has(file.type)) {
      setClientError('CV must be a PDF or Word document (.pdf, .doc, .docx).');
      setCvFile(null);
      e.target.value = '';
      return;
    }
    setCvFile(file);
  };

  const isSuccess = state.status === 'success';
  const errorMessage =
    clientError ||
    (state.status === 'error' ? state.message : null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="apply-dialog-title"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />

      <div
        ref={dialogRef}
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="bg-[#222c4a] px-6 py-5">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="w-4 h-4 text-[#fbc134]" />
                <span className="text-[#fbc134] text-xs font-semibold uppercase tracking-wider">
                  Apply for this job
                </span>
              </div>
              <h2 id="apply-dialog-title" className="text-lg font-bold text-white leading-tight">
                {vacancyTitle}
              </h2>
              {vacancyCarerixId && (
                <p className="text-white/50 text-xs mt-1">Ref: {vacancyCarerixId}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-[#222c4a] mb-2">Application received</h3>
              {(() => {
                if (state.status !== 'success') {
                  return (
                    <>
                      <p className="text-sm text-gray-500 max-w-sm mb-6">
                        We&apos;ve got your application. Please close this window.
                      </p>
                      <button
                        type="button"
                        onClick={onClose}
                        className="bg-[#222c4a] text-white px-8 py-3 rounded-xl font-semibold text-sm hover:bg-[#1a2340] transition-colors"
                      >
                        Close
                      </button>
                    </>
                  );
                }
                // Build the platform origin once for either CTA branch.
                const platformOrigin = (process.env.NEXT_PUBLIC_PLATFORM_URL || 'https://app.confair.com')
                  .replace(/\/+(login|welcome)\/?$/i, '');
                if (state.accountExists) {
                  // Returning candidate — straight to login with email prefilled.
                  const loginUrl = `${platformOrigin}/login?email=${encodeURIComponent(state.email)}`;
                  return (
                    <>
                      <p className="text-sm text-gray-500 max-w-sm mb-6">
                        Welcome back! Sign in to track this application and finish your profile.
                      </p>
                      <a
                        href={loginUrl}
                        className="bg-[#fbc134] text-[#222c4a] px-8 py-3 rounded-xl font-bold text-sm hover:bg-[#f0b020] transition-colors shadow-lg shadow-[#fbc134]/20 inline-flex items-center gap-2"
                      >
                        Sign in to my account →
                      </a>
                    </>
                  );
                }
                // First-time candidate — set a password to unlock the account.
                const welcomeUrl = state.sessionToken
                  ? `${platformOrigin}/welcome?application_id=${state.applicationId}&token=${encodeURIComponent(state.sessionToken)}`
                  : null;
                return (
                  <>
                    <p className="text-sm text-gray-500 max-w-sm mb-6">
                      Set up a password to track this application and add the documents we need.
                    </p>
                    {welcomeUrl ? (
                      <a
                        href={welcomeUrl}
                        className="bg-[#fbc134] text-[#222c4a] px-8 py-3 rounded-xl font-bold text-sm hover:bg-[#f0b020] transition-colors shadow-lg shadow-[#fbc134]/20 inline-flex items-center gap-2"
                      >
                        Create my password →
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={onClose}
                        className="bg-[#222c4a] text-white px-8 py-3 rounded-xl font-semibold text-sm hover:bg-[#1a2340] transition-colors"
                      >
                        Close
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          ) : (
            <form action={formAction} className="space-y-4">
              <input type="hidden" name="vacancy_id"        value={vacancyId} />
              <input type="hidden" name="vacancy_slug"      value={vacancySlug} />
              <input type="hidden" name="vacancy_title"     value={vacancyTitle} />
              <input type="hidden" name="vacancy_carerix_id" value={vacancyCarerixId ?? ''} />

              <div className="grid grid-cols-2 gap-3">
                <Field icon={<User className="w-3 h-3" />} label="First Name *">
                  <input name="first_name" required placeholder="John" className={inputClass} />
                </Field>
                <Field icon={<User className="w-3 h-3" />} label="Last Name *">
                  <input name="last_name" required placeholder="Doe" className={inputClass} />
                </Field>
              </div>

              <Field icon={<Mail className="w-3 h-3" />} label="Email Address *">
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="john.doe@example.com"
                  className={inputClass}
                />
              </Field>

              <Field icon={<Phone className="w-3 h-3" />} label="Phone Number">
                <input
                  name="phone"
                  type="tel"
                  placeholder="+31 6 12345678"
                  className={inputClass}
                />
              </Field>

              <Field icon={<FileText className="w-3 h-3" />} label="Upload CV / Resume">
                <input
                  ref={fileInputRef}
                  name="cv"
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-500 hover:border-[#407df1] hover:text-[#407df1] transition-all flex items-center justify-center gap-2 bg-gray-50/50"
                >
                  {cvFile ? (
                    <>
                      <FileText className="w-4 h-4 text-[#407df1]" />
                      <span className="text-[#407df1] font-medium">{cvFile.name}</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Choose file (PDF, DOC, DOCX, &le; 5 MB)
                    </>
                  )}
                </button>
              </Field>

              <Field icon={<MessageSquare className="w-3 h-3" />} label="Cover Letter / Message">
                <textarea
                  name="message"
                  rows={4}
                  placeholder="Tell us why you're interested in this role..."
                  className={`${inputClass} resize-none`}
                />
              </Field>

              <p className="text-xs text-gray-400 leading-relaxed">
                By submitting this application, you agree to our{' '}
                <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#407df1] hover:underline">
                  Privacy Policy
                </a>{' '}
                and consent to the processing of your personal data for recruitment purposes.
              </p>

              {errorMessage && (
                <p className="text-sm text-red-600">{errorMessage}</p>
              )}

              <SubmitButton />
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-[#407df1] focus:ring-2 focus:ring-[#407df1]/20 outline-none transition-all placeholder:text-gray-300';

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-[#fbc134] text-[#222c4a] py-3.5 rounded-xl font-bold text-sm hover:bg-[#f0b020] transition-colors shadow-lg shadow-[#fbc134]/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Sending…
        </>
      ) : (
        'Submit Application'
      )}
    </button>
  );
}
