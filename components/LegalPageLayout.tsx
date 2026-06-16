import type { ReactNode } from 'react';

/**
 * Shared layout for the legal pages (Privacy Policy, Cookie Policy,
 * Terms of Use). Gives them the same look as the rest of the site: a
 * layered dark hero with an eyebrow + subtitle, and the body content
 * presented in a rounded white card on the warm beige background — the
 * same card treatment used on the About page.
 *
 * Pass `prose={false}` when the children bring their own styling (e.g.
 * Cookiebot's auto-generated declaration) so the typography plugin
 * doesn't override it.
 */
export default function LegalPageLayout({
  title,
  subtitle,
  children,
  prose = true,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  prose?: boolean;
}) {
  return (
    <>
      <section className="relative bg-[#222c4a] py-20 md:py-28 overflow-hidden">
        {/* Soft colour glows give the hero the same layered depth as the
            About hero without needing a background image. */}
        <div className="absolute inset-0 opacity-[0.15] pointer-events-none" aria-hidden="true">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#407df1] blur-3xl" />
          <div className="absolute -bottom-32 -right-16 w-96 h-96 rounded-full bg-[#fbc134] blur-3xl" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <span className="text-[#fbc134] text-sm font-semibold uppercase tracking-wider">Legal</span>
          <h1 className="text-4xl md:text-5xl font-bold text-white mt-3 mb-6">{title}</h1>
          {subtitle && (
            <p className="text-white/70 text-lg max-w-3xl mx-auto leading-relaxed">{subtitle}</p>
          )}
        </div>
      </section>

      <section className="py-16 md:py-24 bg-[#f2eee7]">
        <div className="max-w-4xl mx-auto px-6">
          <div
            className={
              'bg-white rounded-2xl shadow-sm p-8 md:p-12' +
              (prose
                ? ' prose prose-slate max-w-none prose-headings:text-[#222c4a] prose-headings:font-bold' +
                  ' prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-p:text-[#5a6275]' +
                  ' prose-p:leading-relaxed prose-li:text-[#5a6275] prose-strong:text-[#222c4a]' +
                  ' prose-a:text-[#407df1] prose-a:font-medium hover:prose-a:underline'
                : '')
            }
          >
            {children}
          </div>
        </div>
      </section>
    </>
  );
}
