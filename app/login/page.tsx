'use client';

import { useState } from 'react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg('');
    setSubmitting(true);

    try {
      const [{ signInWithEmailAndPassword }, { auth }] = await Promise.all([
        import('firebase/auth'),
        import('@/lib/firebase'),
      ]);

      await signInWithEmailAndPassword(auth, email.trim(), password);
      window.location.assign('/admin');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || 'unknown';
      const rawMessage = (err as { message?: string })?.message || '';
      const messages: Record<string, string> = {
        'auth/invalid-credential': 'Correo o contraseña incorrectos.',
        'auth/user-not-found': 'No existe una cuenta con ese correo.',
        'auth/wrong-password': 'La contraseña es incorrecta.',
        'auth/invalid-api-key': 'La configuración de Firebase no está disponible en este deployment.',
        'auth/operation-not-allowed': 'El acceso con correo y contraseña no está habilitado en Firebase Authentication.',
        'auth/network-request-failed': 'No se pudo conectar con Firebase. Revisa tu conexión e inténtalo de nuevo.',
        'auth/too-many-requests': 'Firebase bloqueó temporalmente los intentos. Espera unos minutos antes de volver a intentar.',
        'auth/invalid-email': 'El formato del correo electrónico no es válido.',
      };

      const friendly = messages[code] || `Firebase rechazó el inicio de sesión (${code}).`;
      setMsg(`${friendly} ${rawMessage && !messages[code] ? rawMessage : ''}`.trim());
      setSubmitting(false);
    }
  }

  return (
    <main className="container" style={{ padding: '80px 0', maxWidth: 520 }}>
      <span className="eyebrow">Club BASA • Administración</span>
      <h1>Inicia sesión</h1>
      <p style={{ color: '#6b7280' }}>
        Acceso exclusivo para cuentas autorizadas en Firebase. La cuenta debe tener permisos de administrador en Firestore.
      </p>

      <form className="form" onSubmit={submit}>
        <div className="field">
          <label htmlFor="email">Correo</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button className="btn primary" type="submit" disabled={submitting}>
          {submitting ? 'Entrando…' : 'Entrar al panel'}
        </button>

        {msg && <p className="error" role="alert">{msg}</p>}
      </form>

      <br />
      <a href="/">← Volver al catálogo</a>
    </main>
  );
}
