import { NextResponse } from 'next/server';
import { reportError } from '@/lib/report-error';

// The browser's half of the error alert: app/error.tsx and
// app/global-error.tsx post here when a visitor sees a crash, and this
// forwards it to confair-api with the shared secret, which the browser never
// holds. Public by nature, so bodies are capped here and confair-api caps the
// mails per hour.

const MAX_BODY = 8 * 1024;

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY) return new NextResponse(null, { status: 413 });

  let body: { message?: unknown; route?: unknown; digest?: unknown; stack?: unknown; hints?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const message = typeof body.message === 'string' ? body.message : '';
  if (!message) return new NextResponse(null, { status: 400 });

  await reportError({
    kind: 'client',
    message,
    route: typeof body.route === 'string' ? body.route : undefined,
    digest: typeof body.digest === 'string' ? body.digest : undefined,
    stack: typeof body.stack === 'string' ? body.stack : undefined,
    hints: typeof body.hints === 'string' ? body.hints.slice(0, 300) : undefined,
    userAgent: request.headers.get('user-agent') || undefined,
  });
  return new NextResponse(null, { status: 204 });
}
