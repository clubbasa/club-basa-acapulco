'use client';

import { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { waLink } from '@/lib/whatsapp';

const ERROR_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'Ya existe una cuenta con ese correo. Intenta iniciar sesión.',
  'auth/invalid-email': 'El correo no es válido.',
  'auth/weak-password': 'La contraseña debe tener al menos 8 caracteres.',
  'auth/network-request-failed': 'No se pudo conectar con Firebase. Revisa tu conexión e inténtalo de nuevo.',
};

export default function Registro() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [isDistributor, setIsDistributor] = useState(false);
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg('');
    setSubmitting(true);

    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(credential.user, { displayName: name.trim() });
      await setDoc(doc(db, 'users', credential.user.uid), {
        name: name.trim(),
        email: email.trim(),
        whatsapp: whatsapp.trim(),
        enabled: false,
        ...(isDistributor ? { tag: 'Distribuidor' } : {}),
        createdAt: serverTimestamp(),
      });
      setRegistered(true);
      setSubmitting(false);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      const rawMessage = err instanceof Error ? err.message : '';
      setMsg(code ? ERROR_MESSAGES[code] || rawMessage : rawMessage || 'No se pudo crear la cuenta.');
      setSubmitting(false);
    }
  }

  const notifyText = `Hola Club BASA 👋 Acabo de registrarme en el catálogo.\nNombre: ${name.trim()}\nWhatsApp: ${whatsapp.trim()}${isDistributor ? '\nSoy distribuidor.' : ''}\n¿Podrían activar mi cuenta para ver las promociones exclusivas?`;

  if (registered) return (
    <main className="container" style={{ padding: '80px 0', maxWidth: 520 }}>
      <span className="eyebrow">Club BASA • Mi cuenta</span>
      <h1>¡Cuenta creada!</h1>
      <p style={{ color: '#6b7280' }}>
        Un administrador debe activar tu cuenta antes de que puedas ver las promociones exclusivas. Avísale por WhatsApp para que la active más rápido.
      </p>
      <a className="btn primary" href={waLink(notifyText)} target="_blank" rel="noreferrer">Avisar por WhatsApp</a>
      <p style={{ marginTop: 20 }}><a href="/mi-cuenta">Ir a mi cuenta →</a></p>
    </main>
  );

  return (
    <main className="container" style={{ padding: '80px 0', maxWidth: 520 }}>
      <span className="eyebrow">Club BASA • Mi cuenta</span>
      <h1>Crea tu cuenta</h1>
      <p style={{ color: '#6b7280' }}>
        Regístrate para acceder a promociones, eventos, videos e imágenes exclusivas. Un administrador debe aprobar tu cuenta antes de que puedas verlas.
      </p>

      <form className="form" onSubmit={submit}>
        <div className="field">
          <label htmlFor="name">Nombre</label>
          <input id="name" type="text" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="email">Correo</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="whatsapp">WhatsApp</label>
          <input id="whatsapp" type="tel" required minLength={8} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="744 123 4567" />
        </div>

        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <input id="password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, cursor: 'pointer' }}>
          <input type="checkbox" checked={isDistributor} onChange={(e) => setIsDistributor(e.target.checked)} /> Soy Distribuidor
        </label>

        <button className="btn primary" type="submit" disabled={submitting}>
          {submitting ? 'Creando cuenta…' : 'Crear mi cuenta'}
        </button>

        {msg && <p className="error" role="alert">{msg}</p>}
      </form>

      <br />
      <p>¿Ya tienes cuenta? <a href="/login">Inicia sesión</a></p>
      <a href="/">← Volver al catálogo</a>
    </main>
  );
}
