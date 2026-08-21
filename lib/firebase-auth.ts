'use client';

import { getAuth } from 'firebase/auth';
import { firebaseApp } from '@/lib/firebase-config';

export const auth = getAuth(firebaseApp);
