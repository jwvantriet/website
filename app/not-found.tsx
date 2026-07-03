import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="bg-gray-50 min-h-[60vh] flex items-center">
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <p className="text-cblue text-sm font-semibold uppercase tracking-wider mb-3">
          404
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-navy mb-4">
          Page not found
        </h1>
        <p className="text-navy-500 text-lg mb-8">
          Sorry, we couldn&apos;t find what you were looking for.
        </p>
        <Link
          href="/"
          className="inline-block bg-yellow text-navy px-7 py-3.5 rounded-lg font-bold hover:bg-yellow-600 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </section>
  );
}
