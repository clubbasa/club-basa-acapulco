'use client';

import { getFirestore } from 'firebase/firestore';
import { GoogleAuthProvider } from 'firebase/auth';
import { firebaseApp } from '@/lib/firebase-config';
export { auth } from '@/lib/firebase-auth';

export { firebaseApp };
export const db = getFirestore(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
