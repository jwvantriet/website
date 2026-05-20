import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="bg-gray-50 min-h-[60vh] flex items-center">
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <p className="text-[#407df1] text-sm font-semibold uppercase tracking-wider mb-3">
          404
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-[#222c4a] mb-4">
          Page not found
        </h1>
        <p className="text-[#5a6275] text-lg mb-8">
          Sorry, we couldn&apos;t find what you were looking for.
        </p>
        <Link
          href="/"
          className="inline-block bg-[#fbc134] text-[#222c4a] px-7 py-3.5 rounded-lg font-bold hover:bg-[#e5af2e] transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </section>
  );
}
