import { collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type SelectionMode = 'single' | 'multiple';
// 'single'   -> elegir exactamente una opción (ej. sabor de panquecito, fibra).
// 'multiple' -> distribuir una cantidad entre varias opciones (ej. 3 cucharadas de malteada).

export type OptionGroup = {
  id: string;
  productId: string;
  label: string;
  selectionMode: SelectionMode;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  allowDuplicates: boolean;
  sortOrder: number;
  active: boolean;
  updatedAt?: unknown;
};

export type ProductOption = {
  id: string;
  groupId: string;
  productId: string;
  label: string;
  priceDelta: number;
  active: boolean;
  available: boolean;
  sortOrder: number;
  updatedAt?: unknown;
};

const optionGroupsRef = collection(db, 'optionGroups');
const productOptionsRef = collection(db, 'productOptions');

export async function getOptionGroups(): Promise<OptionGroup[]> {
  const snap = await getDocs(query(optionGroupsRef, orderBy('sortOrder', 'asc')));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() } as OptionGroup));
}

export async function getProductOptions(): Promise<ProductOption[]> {
  const snap = await getDocs(query(productOptionsRef, orderBy('sortOrder', 'asc')));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() } as ProductOption));
}

/** Grupos + opciones de un solo producto, ya filtrados a `active`. Las opciones agotadas
 * (`available: false`) se conservan en el resultado — el configurador las muestra tachadas
 * en vez de ocultarlas; solo `active: false` las quita por completo. */
export async function getProductConfiguration(productId: string): Promise<{ groups: OptionGroup[]; options: ProductOption[] }> {
  const [groupSnap, optionSnap] = await Promise.all([
    getDocs(query(optionGroupsRef, where('productId', '==', productId), orderBy('sortOrder', 'asc'))),
    getDocs(query(productOptionsRef, where('productId', '==', productId), orderBy('sortOrder', 'asc'))),
  ]);
  const groups = groupSnap.docs.map((item) => ({ id: item.id, ...item.data() } as OptionGroup)).filter((item) => item.active !== false);
  const options = optionSnap.docs.map((item) => ({ id: item.id, ...item.data() } as ProductOption)).filter((item) => item.active !== false);
  return { groups, options };
}

export async function saveOptionGroup(group: OptionGroup) {
  const data = Object.fromEntries(Object.entries(group).filter(([, value]) => value !== undefined));
  await setDoc(doc(optionGroupsRef, group.id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

export async function removeOptionGroup(id: string) { await deleteDoc(doc(optionGroupsRef, id)); }

export async function saveProductOption(option: ProductOption) {
  const data = Object.fromEntries(Object.entries(option).filter(([, value]) => value !== undefined));
  await setDoc(doc(productOptionsRef, option.id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

export async function removeProductOption(id: string) { await deleteDoc(doc(productOptionsRef, id)); }

/** Lectura sincrónica sobre listas ya cargadas — para decidir en el catálogo si un producto
 * necesita el configurador o el stepper simple, sin volver a pedirle nada a Firestore. */
export function hasOptionGroups(productId: string, groups: OptionGroup[]): boolean {
  return groups.some((group) => group.productId === productId && group.active !== false);
}
