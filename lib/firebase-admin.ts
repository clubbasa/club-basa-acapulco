import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let cachedApp: App | undefined;

function getAdminApp() {
  if (cachedApp) return cachedApp;
  const existing = getApps()[0];
  if (existing) { cachedApp = existing; return cachedApp; }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY)?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) throw new Error('Missing Firebase Admin environment variables.');

  cachedApp = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  return cachedApp;
}

export function getAdminAuth(): Auth { return getAuth(getAdminApp()); }
export function getAdminDb(): Firestore { return getFirestore(getAdminApp()); }

// Backwards-compatible aliases used by the v2 app.
export const adminAuth = getAdminAuth;
export const adminDb = getAdminDb;
