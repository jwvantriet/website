import { NextRequest } from 'next/server';

// Same-origin download for the Certificate of Electronic Signature: proxies
// the token-gated PDF from confair-api so the browser gets a clean
// confair.com/p/<token>/certificate.pdf link (keeps CONFAIR_API_URL server-side).
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const apiUrl = process.env.CONFAIR_API_URL;
  if (!apiUrl) return new Response('Certificate unavailable', { status: 503 });

  try {
    const res = await fetch(
      `${apiUrl}/proposal/${encodeURIComponent(params.token)}/certificate.pdf`,
      { cache: 'no-store', signal: AbortSignal.timeout(15000) },
    );
    if (!res.ok) {
      return new Response('Certificate not found', { status: res.status === 404 ? 404 : 502 });
    }
    const body = await res.arrayBuffer();
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition':
          res.headers.get('content-disposition') ??
          'attachment; filename="Confair_signing_certificate.pdf"',
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return new Response('Certificate unavailable', { status: 502 });
  }
}
