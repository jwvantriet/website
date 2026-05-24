import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, CheckCircle2, Info } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import UploadList, { type DocSlot, type ApplicationContext } from './UploadList';

export const metadata: Metadata = {
  title: 'Upload your documents',
  robots: { index: false, follow: false },
};

// Don't cache — every visit needs to re-check the session token.
export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
  searchParams: { token?: string };
}

interface UploadView {
  application: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    vacancy_title: string;
    vacancy_slug: string;
    vacancy_carerix_id: string | null;
    function_group_id: number | null;
    function_group_name: string | null;
    function_group_industry: string | null;
    step: string;
    session_expires_at: string | null;
  };
  slots: Array<{
    document_type_id: number;
    slug: string;
    name: string;
    description: string | null;
    is_required: boolean;
    display_order: number;
  }>;
  uploads: Array<{
    document_type_id: number | null;
    id: number;
    filename: string;
    size_bytes: number;
    carerix_push_status: string;
    ai_extracted_at: string | null;
  }>;
}

async function loadView(id: number, token: string): Promise<UploadView | null> {
  // The page can't SELECT from vacancy_applications / vacancy_application_documents
  // directly — RLS blocks anon reads on both. The RPC bundles all the data
  // we need into a single SECURITY DEFINER call that validates the token
  // before returning anything.
  const supabase = createClient();
  const { data, error } = await supabase.rpc('get_apply_upload_view', {
    p_application_id: id,
    p_session_token:  token,
  });
  if (error) {
    console.error('[apply-upload] get_apply_upload_view rpc failed', {
      message: error.message, code: error.code, details: error.details, hint: error.hint,
    });
    return null;
  }
  if (!data) return null;
  return data as UploadView;
}

export default async function UploadPage({ params, searchParams }: PageProps) {
  const id = Number(params.id);
  const token = (searchParams.token || '').trim();
  if (!Number.isFinite(id) || !token) notFound();

  const view = await loadView(id, token);
  if (!view) notFound();

  const { application } = view;
  const slots: DocSlot[] = view.slots
    .sort((a, b) => a.display_order - b.display_order)
    .map((s) => {
      const uploaded = view.uploads.find((u) => u.document_type_id === s.document_type_id);
      return {
        documentTypeId: s.document_type_id,
        slug:           s.slug,
        name:           s.name,
        description:    s.description,
        isRequired:     s.is_required,
        uploaded:       uploaded
          ? {
              id:            uploaded.id,
              filename:      uploaded.filename,
              sizeBytes:     uploaded.size_bytes,
              carerixStatus: uploaded.carerix_push_status,
            }
          : null,
      };
    });

  // No function group on the vacancy yet — guide the candidate to email
  // their docs the old-fashioned way rather than show an empty page.
  if (!application.function_group_id) {
    return (
      <section className="bg-gray-50 min-h-[70vh] py-16">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <div className="w-14 h-14 rounded-full bg-[#fbc134]/15 flex items-center justify-center mx-auto mb-6">
            <Info className="w-7 h-7 text-[#fbc134]" />
          </div>
          <h1 className="text-2xl font-bold text-[#222c4a] mb-3">
            We&apos;ve received your application, {application.first_name}.
          </h1>
          <p className="text-gray-600 mb-6">
            We couldn&apos;t auto-classify this vacancy yet, so the document
            checklist isn&apos;t available here. A recruiter will be in touch
            shortly with the next steps — usually within one business day.
          </p>
          <p className="text-sm text-gray-500">
            In the meantime, you can email any documents you have ready to{' '}
            <a href="mailto:recruitment@confair.com" className="text-[#407df1] hover:underline">
              recruitment@confair.com
            </a>{' '}
            with the subject &ldquo;Application {application.id} — {application.vacancy_title}&rdquo;.
          </p>
        </div>
      </section>
    );
  }

  const required = slots.filter((s) => s.isRequired);
  const optional = slots.filter((s) => !s.isRequired);

  const context: ApplicationContext = {
    applicationId: application.id,
    sessionToken: token,
    firstName: application.first_name,
    vacancyTitle: application.vacancy_title,
    vacancySlug: application.vacancy_slug,
  };

  return (
    <>
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-[#222c4a] transition-colors">Home</Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <Link href="/vacancies" className="hover:text-[#222c4a] transition-colors">Vacancies</Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <Link href={`/vacancies/${application.vacancy_slug}`} className="hover:text-[#222c4a] transition-colors truncate max-w-[200px]">
              {application.vacancy_title}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <span className="text-[#222c4a] font-medium">Upload documents</span>
          </nav>
        </div>
      </div>

      <section className="bg-gray-50 py-10 md:py-14">
        <div className="max-w-3xl mx-auto px-6">
          {/* Stepper */}
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 mb-6">
            <span className="text-emerald-600 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Applied
            </span>
            <span className="text-gray-300">›</span>
            <span className="text-[#222c4a]">Upload documents</span>
            <span className="text-gray-300">›</span>
            <span>Verify &amp; finish</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-[#222c4a] mb-3">
            Almost there, {application.first_name} 👋
          </h1>
          <p className="text-gray-600 mb-2">
            Upload your documents so we can pre-fill your profile and match you faster to{' '}
            <strong className="text-[#222c4a]">{application.vacancy_title}</strong>.
          </p>
          <p className="text-sm text-gray-500 mb-10">
            Files are stored securely. We&apos;ll only share them with the recruitment team. Accepted:
            PDF, Word, JPG, PNG. Max 10 MB per file.
          </p>

          <UploadList
            context={context}
            required={required}
            optional={optional}
          />
        </div>
      </section>
    </>
  );
}
