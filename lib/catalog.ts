import { collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { products as fallbackProducts, type Product } from '@/lib/menu';

export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  sortOrder: number;
};

export type CatalogProduct = Product & {
  active: boolean;
  image?: string;
  imagePath?: string;
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

  const products = productSnap.docs
    .map((item) => ({ id: item.id, ...item.data() } as CatalogProduct))
    .filter((item) => item.active !== false);

  const categories = categorySnap.docs
    .map((item) => ({ id: item.id, ...item.data() } as CatalogCategory))
    .filter((item) => item.active !== false);

  return { products, categories };
}

export function getFallbackProducts(): CatalogProduct[] {
  return fallbackProducts.map((product, index) => ({
    ...product,
    active: true,
    sortOrder: index,
  }));
}

export function getFallbackCategories(): CatalogCategory[] {
  return Array.from(new Set(fallbackProducts.map((p) => p.category))).map((name, index) => ({
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    active: true,
    sortOrder: index,
  }));
}

export async function saveProduct(product: CatalogProduct) {
  await setDoc(doc(productsRef, product.id), {
    ...product,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function uploadProductImage(productId: string, file: File) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const imagePath = `products/${productId}/${Date.now()}-${safeName}`;
  const imageRef = ref(storage, imagePath);

  // The original file is uploaded without resizing or compression so high-resolution
  // product photos keep their original dimensions and visual quality.
  const snapshot = await uploadBytes(imageRef, file, {
    contentType: file.type,
    cacheControl: 'public,max-age=31536000',
  });

  const image = await getDownloadURL(snapshot.ref);
  return { image, imagePath };
}

export async function removeProductImage(imagePath?: string) {
  if (!imagePath) return;
  await deleteObject(ref(storage, imagePath));
}

export async function removeProduct(id: string) {
  await deleteDoc(doc(productsRef, id));
}

export async function saveCategory(category: CatalogCategory) {
  await setDoc(doc(categoriesRef, category.id), {
    ...category,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function removeCategory(id: string) {
  await deleteDoc(doc(categoriesRef, id));
}

export async function seedCatalog() {
  const categories = getFallbackCategories();
  const products = getFallbackProducts();
  await Promise.all([
    ...categories.map(saveCategory),
    ...products.map(saveProduct),
  ]);
}
