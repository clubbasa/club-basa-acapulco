'use client';

import { useEffect, useState } from 'react';
import { getSiteSettings } from '@/lib/settings';

// Por defecto bloqueado (fail-safe): si Firestore tarda o falla, las imágenes
// se quedan protegidas en vez de quedar desprotegidas sin que nadie lo note.
export function useImageLock(): boolean {
  const [locked, setLocked] = useState(true);

  useEffect(() => {
    let mounted = true;
    getSiteSettings()
      .then((settings) => { if (mounted) setLocked(!settings.imagesDownloadable); })
      .catch(() => { /* Se queda protegido por defecto. */ });
    return () => { mounted = false; };
  }, []);

  return locked;
}
