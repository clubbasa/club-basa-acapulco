export type ProductVideoProvider =
  | 'youtube'
  | 'google-drive'
  | 'vimeo'
  | 'hotmart'
  | 'udemy'
  | 'mp4'
  | 'hls'
  | 'embed';

export const productVideoProviders: Array<{ value: ProductVideoProvider; label: string; hint: string }> = [
  { value: 'youtube', label: 'YouTube', hint: 'Pega la URL del video o del enlace compartido.' },
  { value: 'google-drive', label: 'Google Drive', hint: 'Usa un archivo de video compartido con acceso de visualización.' },
  { value: 'vimeo', label: 'Vimeo', hint: 'Pega la URL pública o privada apta para reproducción en tu dominio.' },
  { value: 'hotmart', label: 'Hotmart', hint: 'Usa una URL de reproductor/embed si tu plan permite incrustación.' },
  { value: 'udemy', label: 'Udemy', hint: 'Usa una URL de reproductor/embed si está disponible.' },
  { value: 'mp4', label: 'MP4 / video directo', hint: 'URL directa a un archivo .mp4.' },
  { value: 'hls', label: 'HLS (.m3u8)', hint: 'URL de un stream HLS; depende del soporte del navegador.' },
  { value: 'embed', label: 'Otro / iframe', hint: 'URL de un reproductor que permita incrustación.' },
];

function getYouTubeId(value: string) {
  try {
    const url = new URL(value);
    if (url.hostname.includes('youtu.be')) return url.pathname.slice(1).split('/')[0];
    if (url.hostname.includes('youtube.com')) {
      if (url.pathname === '/watch') return url.searchParams.get('v');
      const parts = url.pathname.split('/').filter(Boolean);
      const index = parts.findIndex((part) => part === 'embed' || part === 'shorts' || part === 'live');
      if (index >= 0) return parts[index + 1] || null;
    }
  } catch { /* invalid URL is handled by the UI */ }
  return null;
}

function getVimeoId(value: string) {
  const match = value.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  return match?.[1] || null;
}

function getGoogleDriveId(value: string) {
  const match = value.match(/(?:\/d\/|id=)([a-zA-Z0-9_-]+)/);
  return match?.[1] || null;
}

export function getProductVideoEmbed(provider: ProductVideoProvider | undefined, value: string | undefined) {
  if (!provider || !value?.trim()) return null;
  const url = value.trim();

  if (provider === 'youtube') {
    const id = getYouTubeId(url);
    return id ? { kind: 'iframe' as const, src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0` } : null;
  }

  if (provider === 'vimeo') {
    const id = getVimeoId(url);
    return id ? { kind: 'iframe' as const, src: `https://player.vimeo.com/video/${encodeURIComponent(id)}` } : null;
  }

  if (provider === 'google-drive') {
    const id = getGoogleDriveId(url);
    return id ? { kind: 'iframe' as const, src: `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview` } : null;
  }

  if (provider === 'mp4') return { kind: 'video' as const, src: url };
  if (provider === 'hls') return { kind: 'video' as const, src: url };

  return { kind: 'iframe' as const, src: url };
}
