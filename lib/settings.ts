import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type SiteSettings = { imagesDownloadable: boolean };

export async function getSiteSettings(): Promise<SiteSettings> {
  const snap = await getDoc(doc(db, 'settings', 'site'));
  return { imagesDownloadable: snap.data()?.imagesDownloadable === true };
}

export async function updateSiteSettings(settings: Partial<SiteSettings>): Promise<void> {
  await setDoc(doc(db, 'settings', 'site'), settings, { merge: true });
}
