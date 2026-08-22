'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { getPromotions, type Promotion } from '@/lib/promotions';
import { getProductVideoEmbed } from '@/lib/video';

type UserProfile = { name?: string; enabled?: boolean };

export default function MiCuenta() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) { setLoading(false); return; }
      try {
        const [userDoc, adminDoc] = await Promise.all([
          getDoc(doc(db, 'users', currentUser.uid)),
          getDoc(doc(db, 'admins', currentUser.uid)),
        ]);
        const userProfile = userDoc.exists() ? (userDoc.data() as UserProfile) : null;
        const admin = adminDoc.exists() && adminDoc.data()?.enabled === true;
        setProfile(userProfile);
        setIsAdmin(admin);
        if (admin || userProfile?.enabled) setPromotions(await getPromotions(true));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  if (loading) return <main className="container" style={{ padding: '80px 0' }}><h1>Mi cuenta</h1><p>Cargando…</p></main>;

  if (!user) return <main className="container" style={{ padding: '80px 0' }}>
    <span className="eyebrow">Club BASA • Mi cuenta</span>
    <h1>Mi cuenta</h1>
    <p>Inicia sesión para ver tus promociones, eventos, videos e imágenes exclusivas.</p>
    <a className="btn primary" href="/login">Iniciar sesión</a>
    <p style={{ marginTop: 14 }}>¿Aún no tienes cuenta? <a href="/registro">Créala aquí</a>.</p>
  </main>;

  const approved = isAdmin || profile?.enabled === true;

  return <main className="container" style={{ padding: '50px 0 90px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
      <div><span className="eyebrow">Club BASA • Mi cuenta</span>
      <h1>Hola{profile?.name ? `, ${profile.name}` : ''}</h1></div>
      <button type="button" className="btn secondary" onClick={() => signOut(auth)}>Cerrar sesión</button>
    </div>

    {isAdmin && <div className="card" style={{ margin: '18px 0' }}>Tu cuenta tiene permisos de administrador. <a href="/admin">Ir al panel de administración →</a></div>}

    {!approved ? (
      <div className="card" style={{ margin: '18px 0' }}>
        <h2>Cuenta pendiente de aprobación</h2>
        <p>Un administrador debe habilitar tu cuenta antes de que puedas ver el contenido exclusivo. Te avisaremos en cuanto esté lista.</p>
      </div>
    ) : (
      <section style={{ padding: '25px 0' }}>
        <div className="sectionHead"><h2>Promociones y contenido exclusivo</h2></div>
        {promotions.length === 0 ? <p>Todavía no hay contenido publicado. Vuelve pronto.</p> : <div className="grid3">
          {promotions.map((item) => {
            const embed = item.type === 'video' ? getProductVideoEmbed(item.videoProvider, item.videoUrl) : null;
            return <div className="card" key={item.id}>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
              {item.image && <img src={item.image} alt={item.title} style={{ width: '100%', borderRadius: 12, marginTop: 8 }} />}
              {embed && (embed.kind === 'iframe'
                ? <iframe src={embed.src} title={item.title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen style={{ width: '100%', aspectRatio: '16 / 9', border: 0, borderRadius: 12, marginTop: 8 }} />
                : <video src={embed.src} controls playsInline style={{ width: '100%', borderRadius: 12, marginTop: 8 }} />)}
            </div>;
          })}
        </div>}
      </section>
    )}

    <p style={{ marginTop: 30 }}><a href="/">← Volver al catálogo</a></p>
  </main>;
}
