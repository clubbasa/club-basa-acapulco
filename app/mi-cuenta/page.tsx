'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut, updateProfile, type User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { getPromotions, type Promotion } from '@/lib/promotions';
import { getProductVideoEmbed } from '@/lib/video';

type UserProfile = { name?: string; whatsapp?: string; enabled?: boolean };

export default function MiCuenta() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editName, setEditName] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

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

  useEffect(() => {
    if (!profile) return;
    setEditName(profile.name || '');
    setEditWhatsapp(profile.whatsapp || '');
  }, [profile]);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setProfileMsg(null);
    setSavingProfile(true);
    try {
      const name = editName.trim();
      const whatsapp = editWhatsapp.trim();
      await updateDoc(doc(db, 'users', user.uid), { name, whatsapp });
      await updateProfile(user, { displayName: name });
      setProfile((current) => ({ ...current, name, whatsapp }));
      setProfileMsg({ type: 'ok', text: 'Perfil actualizado.' });
    } catch (error) {
      console.error(error);
      setProfileMsg({ type: 'error', text: 'No se pudo guardar. Intenta de nuevo.' });
    } finally {
      setSavingProfile(false);
    }
  }

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

    <section style={{ padding: '25px 0' }}>
      <div className="sectionHead"><h2>Mi perfil</h2><p>Actualiza tu nombre y tu WhatsApp de contacto.</p></div>
      <form className="form" style={{ maxWidth: 420 }} onSubmit={saveProfile}>
        <div className="field">
          <label htmlFor="profile-name">Nombre</label>
          <input id="profile-name" type="text" required minLength={2} value={editName} onChange={(e) => setEditName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="profile-whatsapp">WhatsApp</label>
          <input id="profile-whatsapp" type="tel" required minLength={8} value={editWhatsapp} onChange={(e) => setEditWhatsapp(e.target.value)} placeholder="744 123 4567" />
        </div>
        <button className="btn primary" type="submit" disabled={savingProfile}>{savingProfile ? 'Guardando…' : 'Guardar cambios'}</button>
        {profileMsg && <p className={profileMsg.type === 'error' ? 'error' : 'small'} role={profileMsg.type === 'error' ? 'alert' : undefined} style={{ marginTop: 10 }}>{profileMsg.text}</p>}
      </form>
    </section>

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
