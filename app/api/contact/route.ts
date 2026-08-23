import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase-admin';
import { enforceRateLimit, errorResponse, readJsonBody, successResponse } from '@/lib/api-abuse';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const rateLimitError = enforceRateLimit(req, 'contact', { limit: 5, windowMs: 15 * 60_000 });
  if (rateLimitError) return rateLimitError;

  const parsed = await readJsonBody(req);
  if ('error' in parsed) return parsed.error;
  const body = parsed.data;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return errorResponse('Solicitud inválida.', 400);

  const { name: rawName, contact: rawContact, message: rawMessage } = body as Record<string, unknown>;
  const name = typeof rawName === 'string' ? rawName.trim() : '';
  const contact = typeof rawContact === 'string' ? rawContact.trim() : '';
  const message = typeof rawMessage === 'string' ? rawMessage.trim() : '';
  const isValidContact = /^[^\s@]+@[^\s@]+\.[^\s@]+$|^\+?[0-9\s-]{8,}$/.test(contact);

  if (name.length < 2 || name.length > 200 || !isValidContact || message.length < 10 || message.length > 2_000) {
    return errorResponse('Datos de contacto inválidos.', 400);
  }

  try {
    await getAdminDb().collection('contacts').add({ name, contact, message, createdAt: FieldValue.serverTimestamp() });
  } catch (error) {
    console.error('Contact form save error:', error);
    return errorResponse('No se pudo guardar el mensaje.', 500);
  }

  return successResponse({ message: 'Contacto recibido' });
}
