'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { track } from '@/lib/analytics';

const SKIP_PREFIXES = ['/admin', '/login'];

export default function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return;
    track('page_view', { path: pathname });
  }, [pathname]);

  return null;
}
