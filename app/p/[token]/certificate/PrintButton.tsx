'use client';

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg bg-navy px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-navy-800 print:hidden"
    >
      Download / print certificate
    </button>
  );
}
