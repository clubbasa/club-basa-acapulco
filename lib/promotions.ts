import { collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import type { ProductVideoProvider } from '@/lib/video';

export type PromotionType = 'promo' | 'evento' | 'video' | 'imagen';

export type Promotion = {
  id: string;
  title: string;
  description: string;
  type: PromotionType;
  image?: string;
  videoProvider?: ProductVideoProvider;
  videoUrl?: string;
  active: boolean;
  sortOrder: number;
  updatedAt?: unknown;
};

const promotionsRef = collection(db, 'promotions');

export async function getPromotions(activeOnly = false) {
  const snap = await getDocs(query(promotionsRef, orderBy('sortOrder', 'asc')));
  const items = snap.docs.map((item) => ({ id: item.id, ...item.data() } as Promotion));
  return activeOnly ? items.filter((item) => item.active) : items;
}

export async function savePromotion(promotion: Promotion) {
  const data = Object.fromEntries(Object.entries(promotion).filter(([, value]) => value !== undefined));
  await setDoc(doc(promotionsRef, promotion.id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

export async function removePromotion(id: string) {
  await deleteDoc(doc(promotionsRef, id));
}

function safeFilename(value: string) {
  const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return normalized.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 140) || 'imagen';
}

export async function uploadPromotionImage(promotionId: string, file: File) {
  const currentUser = getAuth().currentUser || auth.currentUser;
  if (!currentUser) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');

  const token = await currentUser.getIdToken();
  const response = await fetch('/api/admin/r2-image-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      filename: safeFilename(file.name),
      contentType: file.type,
      size: file.size,
      productId: promotionId,
      folder: 'promotions',
    }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'No se pudo preparar la subida de la imagen.');

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', payload.uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`R2 respondió ${xhr.status}.`));
    xhr.onerror = () => reject(new Error('La conexión con Cloudflare R2 falló.'));
    xhr.send(file);
  });

  return { image: payload.publicUrl as string };
}
