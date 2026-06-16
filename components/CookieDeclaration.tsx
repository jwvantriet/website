'use client';
/**
 * Renders Cookiebot's auto-generated cookie declaration table inline,
 * inside whatever container this component is placed in.
 *
 * Cookiebot's cd.js inserts the declaration immediately after its own
 * <script> element (it uses document.currentScript). Loading it via
 * next/script (afterInteractive) injects the script at the end of
 * <body>, so the table ends up rendered below the footer. To keep it
 * inside the page content we append the script element to our own ref'd
 * container, which is where the declaration then renders.
 */
import { useEffect, useRef } from 'react';

// Public Cookiebot group ID (data-cbid) — see app/layout.tsx.
const COOKIEBOT_CBID = '47f0ce2e-c2fa-4634-bf72-978741be7db6';

export default function CookieDeclaration() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // Guard against double-injection (React strict mode / fast refresh).
    if (container.querySelector('#CookieDeclaration')) return;

    const script = document.createElement('script');
    script.id = 'CookieDeclaration';
    script.src = `https://consent.cookiebot.com/${COOKIEBOT_CBID}/cd.js`;
    script.type = 'text/javascript';
    script.async = true;
    container.appendChild(script);

    return () => {
      // Clear injected declaration + script on unmount so navigating
      // back to the page re-renders it cleanly.
      container.innerHTML = '';
    };
  }, []);

  return <div ref={containerRef} />;
}
