'use client';

import { useEffect, useState } from 'react';

export default function Admin() {
  const [user, setUser] = useState<unknown>(null);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    import('@/lib/firebase')
      .then(({ auth }) => {
        if (cancelled) return;
        import('firebase/auth').then(({ onAuthStateChanged }) => {
          if (cancelled) return;
          unsubscribe = onAuthStateChanged(auth, setUser);
        });
      })
      .catch((error) => {
        console.error('Firebase admin initialization failed:', error);
        if (!cancelled) {
          setFirebaseError('No se pudo inicializar Firebase. Revisa la configuración de Firebase en Vercel.');
        }
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  if (firebaseError) {
    return (
      <main className="container" style={{ padding: '80px 0' }}>
        <h1>Panel de administración</h1>
        <p>{firebaseError}</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="container" style={{ padding: '80px 0' }}>
        <h1>Panel de administración</h1>
        <p>Inicia sesión para continuar.</p>
        <a className="btn primary" href="/login">Entrar</a>
      </main>
    );
  }

  return (
    <main className="container" style={{ padding: '50px 0' }}>
      <span className="eyebrow">Admin</span>
      <h1>Centro de control Club BASA</h1>
      <div className="grid3">
        <div className="card">
          <h3>Tráfico</h3>
          <p>Conecta GA4 y eventos propios para visitas, CTA, catálogo y conversiones.</p>
        </div>
        <div className="card">
          <h3>Usuarios</h3>
          <p>Firebase Authentication + Firestore. Usa claims de rol para limitar acceso.</p>
        </div>
        <div className="card">
          <h3>Exportaciones</h3>
          <p>Preparado para CSV/PDF mediante una función de servidor autenticada.</p>
        </div>
      </div>
      <section>
        <div className="card">
          <h3>Seguridad</h3>
          <p>App Check + Security Rules + MFA para administración. No se deben colocar secretos Firebase Admin en el cliente.</p>
        </div>
      </section>
    </main>
  );
}
