import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 200) : '';
  const contact = typeof body?.contact === 'string' ? body.contact.trim().slice(0, 200) : '';
  const message = typeof body?.message === 'string' ? body.message.trim().slice(0, 2000) : '';
  if (!name || !contact) return NextResponse.json({ ok: false, error: 'Datos incompletos' }, { status: 400 });

  try {
    await getAdminDb().collection('contacts').add({ name, contact, message, createdAt: FieldValue.serverTimestamp() });
  } catch (error) {
    console.error('Contact form save error:', error);
    return NextResponse.json({ ok: false, error: 'No se pudo guardar el mensaje.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: 'Contacto recibido' });
}
