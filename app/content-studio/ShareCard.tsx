'use client';

import { useState } from 'react';
import { Copy, Check, Linkedin, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * One shareable content item: editable caption + copy button + a button that
 * opens LinkedIn's share composer with the (UTM-tagged) URL attached.
 */
export default function ShareCard({
  title,
  meta,
  caption,
  shareUrl,
}: {
  title: string;
  meta: string;
  caption: string;
  shareUrl: string;
}) {
  const [text, setText] = useState(caption);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — the textarea is visible for manual copy.
      setOpen(true);
    }
  }

  const composerUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-navy font-bold truncate">{title}</p>
          <p className="text-navy-500 text-xs mt-0.5">{meta}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={copy}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-beige text-navy hover:bg-navy-100 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy caption'}
          </button>
          <a
            href={composerUrl}
            target="_blank"
            rel="noreferrer"
            onClick={copy}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-[#0a66c2] text-white hover:bg-[#095bb0] transition-colors"
          >
            <Linkedin className="w-4 h-4" /> Share
          </a>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="mt-3 flex items-center gap-1 text-xs font-semibold text-cblue hover:underline"
      >
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {open ? 'Hide caption' : 'Preview / edit caption'}
      </button>
      {open && (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={Math.min(14, text.split('\n').length + 2)}
          className="mt-3 w-full bg-beige border border-gray-200 focus:border-cblue focus:ring-2 focus:ring-cblue/20 outline-none rounded-md px-3 py-2 text-sm font-mono leading-relaxed"
        />
      )}
    </div>
  );
}
