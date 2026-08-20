export type ProductVideoProvider =
  | 'youtube'
  | 'google-drive'
  | 'vimeo'
  | 'hotmart'
  | 'udemy'
  | 'mp4'
  | 'hls'
  | 'embed';

export const productVideoProviders: Array<{ value: ProductVideoProvider; label: string }> = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'google-drive', label: 'Google Drive' },
  { value: 'vimeo', label: 'Vimeo' },
  { value: 'hotmart', label: 'Hotmart' },
  { value: 'udemy', label: 'Udemy' },
  { value: 'mp4', label: 'MP4 / video directo' },
  { value: 'hls', label: 'HLS (.m3u8)' },
  { value: 'embed', label: 'Otro / iframe' },
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
