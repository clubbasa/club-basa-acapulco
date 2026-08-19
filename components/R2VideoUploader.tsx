'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { getCatalog, saveProduct, type CatalogProduct } from '@/lib/catalog';

const MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024;
const ACCEPTED = 'video/mp4,video/webm,video/quicktime,video/x-matroska,video/mpeg,video/ogg';

export default function R2VideoUploader() {
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [productId, setProductId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadedUrl, setUploadedUrl] = useState('');

  useEffect(() => {
    if (pathname !== '/admin') return;
    getCatalog().then((result) => setProducts(result.products)).catch((error) => console.error(error));
  }, [pathname]);

  if (pathname !== '/admin') return null;

  const chooseFile = (selected?: File) => {
    if (!selected) return;
    if (!selected.type.startsWith('video/')) return setMessage('Selecciona un archivo de video.');
    if (selected.size > MAX_VIDEO_SIZE) return setMessage('El video no puede superar 2 GB.');
    setFile(selected);
    setUploadedUrl('');
    setMessage('Video seleccionado. Pulsa “Subir a Cloudflare R2”.');
  };

  const upload = async () => {
    if (!productId) return setMessage('Selecciona el producto al que pertenece el video.');
    if (!file) return setMessage('Selecciona un video.');

    const user = auth.currentUser;
    if (!user) return setMessage('Tu sesión de administrador no está activa.');

    setBusy(true);
    setMessage('Preparando carga segura…');

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/r2/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, size: file.size }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'No se pudo preparar la carga.');

      setMessage('Subiendo video directamente a Cloudflare R2…');
      const uploadResponse = await fetch(payload.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploadResponse.ok) throw new Error(`R2 rechazó la carga (${uploadResponse.status}). Revisa la configuración CORS del bucket.`);

      const current = products.find((item) => item.id === productId);
      if (!current) throw new Error('Producto no encontrado.');

      const updated: CatalogProduct = {
        ...current,
        videoProvider: 'cloudflare-r2',
        videoUrl: payload.key,
      };
      await saveProduct(updated);

      setUploadedUrl(payload.publicUrl);
      setProducts((items) => items.map((item) => item.id === productId ? updated : item));
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      setMessage('Video subido a R2 y asociado al producto correctamente.');
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : 'No se pudo subir el video.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="container" style={{ padding: '18px 0 0' }}>
      <div className="card" style={{ border: '2px solid #ff8a00', background: '#fffaf5' }}>
        <span className="eyebrow">Cloudflare R2</span>
        <h2 style={{ marginBottom: 8 }}>Subir video directamente a R2</h2>
        <p style={{ marginTop: 0 }}>Selecciona un producto y un video. La carga va directamente al bucket <strong>club-basa-videos</strong> y queda publicado mediante <strong>media.club-basa.com</strong>.</p>
        <div className="grid3">
          <div className="field">
            <label>Producto</label>
            <select value={productId} onChange={(e) => setProductId(e.target.value)} disabled={busy}>
              <option value="">Seleccionar producto</option>
              {products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <div className="field" style={{ gridColumn: 'span 2' }}>
            <label>Archivo de video</label>
            <input ref={inputRef} type="file" accept={ACCEPTED} onChange={(e) => chooseFile(e.target.files?.[0])} disabled={busy} />
            {file && <small style={{ display: 'block', marginTop: 6 }}>{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</small>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 14 }}>
          <button type="button" className="btn primary" onClick={upload} disabled={busy}>{busy ? 'Subiendo…' : 'Subir a Cloudflare R2'}</button>
          {message && <span>{message}</span>}
        </div>
        {uploadedUrl && <div className="card" style={{ marginTop: 14, background: '#fff' }}><strong>Video publicado</strong><br/><small>{uploadedUrl}</small></div>}
      </div>
    </section>
  );
}
