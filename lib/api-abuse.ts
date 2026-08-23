import { NextResponse } from 'next/server';

type RateLimit = { limit: number; windowMs: number };
type RateLimitEntry = { count: number; resetAt: number };

const MAX_JSON_BYTES = 8 * 1024;
const rateLimitStore = new Map<string, RateLimitEntry>();

function cleanupExpiredEntries(now: number) {
  // Bound memory in long-lived Node.js instances. This is intentionally
  // best-effort: Vercel can run several instances and reset them at any time.
  if (rateLimitStore.size < 1_000) return;
  for (const [key, entry] of rateLimitStore) {
    if (entry.resetAt <= now) rateLimitStore.delete(key);
  }
}

export function getClientIp(request: Request): string {
  // Vercel supplies x-forwarded-for for the original client. Keeping only the
  // first value avoids using a proxy appended later in the chain.
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

export function enforceRateLimit(request: Request, scope: string, config: RateLimit): NextResponse | null {
  const now = Date.now();
  cleanupExpiredEntries(now);

  const key = `${scope}:${getClientIp(request)}`;
  const current = rateLimitStore.get(key);
  const entry = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + config.windowMs }
    : current;

  entry.count += 1;
  rateLimitStore.set(key, entry);

  if (entry.count <= config.limit) return null;

  const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1_000));
  return errorResponse('Demasiadas solicitudes. Intenta de nuevo más tarde.', 429, { 'Retry-After': String(retryAfter) });
}

export async function readJsonBody(request: Request): Promise<{ data: unknown } | { error: NextResponse }> {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return { error: errorResponse('Se requiere contenido JSON.', 415) };
  }

  const contentLength = Number(request.headers.get('content-length') || '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_JSON_BYTES) {
    return { error: errorResponse('La solicitud es demasiado grande.', 413) };
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return { error: errorResponse('No se pudo leer la solicitud.', 400) };
  }

  if (new TextEncoder().encode(text).byteLength > MAX_JSON_BYTES) {
    return { error: errorResponse('La solicitud es demasiado grande.', 413) };
  }

  try {
    return { data: JSON.parse(text) };
  } catch {
    return { error: errorResponse('JSON inválido.', 400) };
  }
}

export function errorResponse(message: string, status: number, headers?: HeadersInit) {
  return NextResponse.json(
    { ok: false, error: message },
    { status, headers: { 'Cache-Control': 'no-store', ...headers } },
  );
}

export function successResponse(payload: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: true, ...payload }, { headers: { 'Cache-Control': 'no-store' } });
}
