import { getAuth } from 'firebase/auth';
import { collection, deleteDoc, deleteField, doc, getDocs, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { products as fallbackProducts, type Product } from '@/lib/menu';
import type { ProductVideoProvider } from '@/lib/video';

export type CatalogCategory = { id: string; name: string; slug: string; active: boolean; sortOrder: number };

export type CatalogProduct = Product & {
  active: boolean;
  image?: string;
  /** @deprecated Legacy field removed from Firestore on the next product save. */
  imagePath?: string;
  videoProvider?: ProductVideoProvider;
  videoUrl?: string;
  videoPath?: string;
  videoMimeType?: string;
  videoSize?: number;
  videoOriginalName?: string;
  videoStorage?: 'r2' | 'external';
  videoDownloadable?: boolean;
  sortOrder: number;
  updatedAt?: unknown;
};

const productsRef = collection(db, 'products');
const categoriesRef = collection(db, 'categories');

export async function getCatalog() {
  const [productSnap, categorySnap] = await Promise.all([
    getDocs(query(productsRef, orderBy('sortOrder', 'asc'))),
    getDocs(query(categoriesRef, orderBy('sortOrder', 'asc'))),
  ]);
  const products = productSnap.docs.map((item) => ({ id: item.id, ...item.data() } as CatalogProduct)).filter((item) => item.active !== false);
  const categories = categorySnap.docs.map((item) => ({ id: item.id, ...item.data() } as CatalogCategory)).filter((item) => item.active !== false);
  return { products, categories };
}

export function getFallbackProducts(): CatalogProduct[] { return fallbackProducts.map((product, index) => ({ ...product, active: true, sortOrder: index })); }
export function getFallbackCategories(): CatalogCategory[] { return Array.from(new Set(fallbackProducts.map((p) => p.category))).map((name, index) => { const slug = slugifyCatalog(name); return { id: slug, name, slug, active: true, sortOrder: index }; }); }

export async function saveProduct(product: CatalogProduct) {
  // Firestore stores catalog metadata only. Binary media lives in R2.
  // Firestore rejects explicit `undefined` values, while optional video fields
  // are intentionally absent for products that do not have a video yet.
  const { imagePath: _legacyImagePath, ...productWithoutLegacyImagePath } = product;
  const catalogData = Object.fromEntries(
    Object.entries(productWithoutLegacyImagePath).filter(([, value]) => value !== undefined),
  );

  await setDoc(
    doc(productsRef, product.id),
    { ...catalogData, imagePath: deleteField(), updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export function slugifyCatalog(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'sin-categoria';
}

function safeFilename(value: string) {
  const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return normalized.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 140) || 'imagen';
}

export async function uploadProductImage(productId: string, file: File) {
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
      productId,
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

  return { image: payload.publicUrl as string, imagePath: payload.key as string };
}

export async function removeProduct(id: string) { await deleteDoc(doc(productsRef, id)); }
export async function saveCategory(category: CatalogCategory) { await setDoc(doc(categoriesRef, category.id), { ...category, updatedAt: serverTimestamp() }, { merge: true }); }
export async function removeCategory(id: string) { await deleteDoc(doc(categoriesRef, id)); }
export async function seedCatalog() { const categories = getFallbackCategories(); const products = getFallbackProducts(); await Promise.all([...categories.map(saveCategory), ...products.map(saveProduct)]); }
