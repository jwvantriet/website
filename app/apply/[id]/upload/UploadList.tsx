'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormState, useFormStatus } from 'react-dom';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
  Lock,
} from 'lucide-react';
import { submitApplicationDocument, type UploadFormState } from './upload-action';

export interface ApplicationContext {
  applicationId: number;
  sessionToken:  string;
  firstName:     string;
  vacancyTitle:  string;
  vacancySlug:   string;
}

export interface DocSlot {
  documentTypeId: number;
  slug:           string;
  name:           string;
  description:    string | null;
  isRequired:     boolean;
  uploaded:       {
    id:           number;
    filename:     string;
    sizeBytes:    number;
    carerixStatus: string;
  } | null;
}

const ACCEPT =
  '.pdf,.doc,.docx,.jpg,.jpeg,.png,.heic,.heif,.webp,' +
  'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,' +
  'image/jpeg,image/png,image/webp,image/heic,image/heif';

const MAX_BYTES = 10 * 1024 * 1024;

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const initialState: UploadFormState = { status: 'idle' };

export default function UploadList({
  context,
  required,
  optional,
}: {
  context:  ApplicationContext;
  required: DocSlot[];
  optional: DocSlot[];
}) {
  const requiredDone = required.filter((s) => s.uploaded).length;
  const requiredAll  = required.length;
  const progressPct  = requiredAll === 0 ? 100 : Math.round((requiredDone / requiredAll) * 100);
  const canContinue  = requiredAll === 0 || requiredDone === requiredAll;

  return (
    <>
      {/* Progress strip */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Required documents
          </span>
          <span className="text-xs text-gray-500">
            {requiredDone} of {requiredAll} done
          </span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full bg-[#fbc134] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Required */}
      {required.length > 0 && (
        <div className="space-y-3 mb-8">
          {required.map((slot) => (
            <SlotRow key={slot.documentTypeId} slot={slot} context={context} />
          ))}
        </div>
      )}

      {/* Optional */}
      {optional.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 mt-8">
            Optional &mdash; speeds up screening
          </h2>
          <div className="space-y-3 mb-8">
            {optional.map((slot) => (
              <SlotRow key={slot.documentTypeId} slot={slot} context={context} />
            ))}
          </div>
        </>
      )}

      {/* Continue CTA */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="text-sm text-gray-600">
          {canContinue ? (
            <>All required documents uploaded. Continue to verify your details.</>
          ) : (
            <>
              You still need <strong className="text-[#222c4a]">{requiredAll - requiredDone}</strong>{' '}
              more required document{requiredAll - requiredDone === 1 ? '' : 's'} before you can continue.
            </>
          )}
        </div>
        <button
          type="button"
          disabled={!canContinue}
          className="bg-[#fbc134] text-[#222c4a] px-7 py-3 rounded-xl font-bold text-sm hover:bg-[#f0b020] transition-colors shadow-lg shadow-[#fbc134]/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none flex items-center gap-2"
          title={canContinue ? undefined : 'Upload all required documents first'}
        >
          {!canContinue && <Lock className="w-3.5 h-3.5" />}
          Continue to verify →
        </button>
      </div>

      <p className="text-xs text-gray-400 text-center mt-6">
        Documents are stored privately and only shared with the Confair recruitment team.
        See our{' '}
        <a href="/privacy-policy" className="text-[#407df1] hover:underline" target="_blank" rel="noopener noreferrer">
          Privacy Policy
        </a>.
      </p>
    </>
  );
}

function SlotRow({ slot, context }: { slot: DocSlot; context: ApplicationContext }) {
  const router = useRouter();
  const [state, formAction] = useFormState(submitApplicationDocument, initialState);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef      = useRef<HTMLFormElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // After a successful upload, refresh the server data so the parent
  // re-reads the new uploaded state and the progress bar updates.
  useEffect(() => {
    if (state.status === 'success' && state.documentTypeId === slot.documentTypeId) {
      router.refresh();
    }
  }, [state, slot.documentTypeId, router]);

  // Optimistic value: if the action just succeeded for this slot, treat
  // it as uploaded even before router.refresh() finishes hydrating.
  const isUploaded = Boolean(
    slot.uploaded ||
      (state.status === 'success' && state.documentTypeId === slot.documentTypeId),
  );
  const optimisticFilename =
    state.status === 'success' && state.documentTypeId === slot.documentTypeId
      ? state.filename
      : slot.uploaded?.filename ?? null;
  const errorMessage =
    localError ??
    (state.status === 'error' && state.documentTypeId === slot.documentTypeId ? state.message : null);

  const submitFile = (file: File) => {
    setLocalError(null);
    if (file.size > MAX_BYTES) {
      setLocalError('That file is over 10 MB.');
      return;
    }
    if (!formRef.current || !fileInputRef.current) return;
    // Attach the chosen file to the hidden input and submit via the form
    // so useFormState picks it up and `pending` is bound to this slot.
    const dt = new DataTransfer();
    dt.items.add(file);
    fileInputRef.current.files = dt.files;
    formRef.current.requestSubmit();
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) submitFile(f);
  };

  const onDrop = (e: React.DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) submitFile(f);
  };

  return (
    <form
      ref={formRef}
      action={formAction}
      className={[
        'bg-white rounded-2xl border shadow-sm transition-all',
        isUploaded ? 'border-emerald-200' : 'border-gray-100',
        dragOver ? 'border-[#407df1] ring-2 ring-[#407df1]/20' : '',
        errorMessage ? 'border-red-200' : '',
      ].join(' ')}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <input type="hidden" name="application_id"    value={context.applicationId} />
      <input type="hidden" name="session_token"     value={context.sessionToken} />
      <input type="hidden" name="document_type_id"  value={slot.documentTypeId} />
      <input
        ref={fileInputRef}
        type="file"
        name="file"
        accept={ACCEPT}
        className="hidden"
        onChange={onPickFile}
      />

      <SlotBody
        slot={slot}
        isUploaded={isUploaded}
        filename={optimisticFilename}
        error={errorMessage}
        onPick={() => fileInputRef.current?.click()}
      />
    </form>
  );
}

function SlotBody({
  slot,
  isUploaded,
  filename,
  error,
  onPick,
}: {
  slot:       DocSlot;
  isUploaded: boolean;
  filename:   string | null;
  error:      string | null;
  onPick:     () => void;
}) {
  const { pending } = useFormStatus();

  return (
    <div className="p-5 flex items-center gap-4">
      <div
        className={[
          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
          isUploaded ? 'bg-emerald-50' : 'bg-gray-50',
        ].join(' ')}
      >
        {pending ? (
          <Loader2 className="w-5 h-5 text-[#407df1] animate-spin" />
        ) : isUploaded ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        ) : (
          <FileText className="w-5 h-5 text-gray-400" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-[#222c4a] truncate">{slot.name}</p>
          {slot.isRequired && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded">
              Required
            </span>
          )}
        </div>
        {slot.description && (
          <p className="text-xs text-gray-500 mt-0.5">{slot.description}</p>
        )}

        {isUploaded ? (
          <p className="mt-1 text-xs truncate">
            <span className="text-emerald-700 font-medium">{filename ?? 'Uploaded'}</span>
            {slot.uploaded && (
              <span className="text-gray-400"> · {formatBytes(slot.uploaded.sizeBytes)}</span>
            )}
          </p>
        ) : (
          <p className="mt-1 text-xs text-gray-400">
            Drop a PDF, Word doc, or image — up to 10 MB.
          </p>
        )}

        {error && (
          <div className="mt-2 flex items-start gap-1.5 text-xs text-red-600">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onPick}
        disabled={pending}
        className={[
          'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50',
          isUploaded
            ? 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            : 'bg-[#222c4a] text-white hover:bg-[#1a2340]',
        ].join(' ')}
      >
        {pending ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…
          </>
        ) : isUploaded ? (
          <>
            <RotateCcw className="w-3.5 h-3.5" /> Replace
          </>
        ) : (
          <>
            <Upload className="w-3.5 h-3.5" /> Upload
          </>
        )}
      </button>
    </div>
  );
}
