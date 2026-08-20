'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, getCountFromServer, getDoc, query, where } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { getCatalog, removeCategory, removeProduct, saveCategory, saveProduct, seedCatalog, slugifyCatalog, type CatalogCategory, type CatalogProduct, uploadProductImage } from '@/lib/catalog';
import { productVideoProviders } from '@/lib/video';

const AREA_LABELS: Record<string, string> = { menu: 'Menú', beneficios: 'Beneficios', envios: 'Envíos', testimonios: 'Testimonios', compartir: 'Compartir', faq: 'FAQ', contacto: 'Contacto' };
const PAGE_LABELS: Record<string, string> = { '/': 'Inicio', '/blog': 'Blog', '/blog/panquecitos-acapulco': 'Blog · Panquecitos', '/blog/menu-club-basa': 'Blog · Menú', '/blog/envios-acapulco': 'Blog · Envíos' };
type VisitStats = { totalViews: number; areas: { key: string; label: string; count: number }[]; pages: { key: string; label: string; count: number }[] };

const blankProduct: CatalogProduct = { id: '', name: '', category: '', price: 0, description: '', availability: '', active: true, sortOrder: 0, videoProvider: undefined, videoUrl: '', videoStorage: undefined, videoDownloadable: true };
const blankCategory: CatalogCategory = { id: '', name: '', slug: '', active: true, sortOrder: 0 };
const MAX_IMAGE_SIZE = 15 * 1024 * 1024;
const MAX_VIDEO_SIZE = 1024 * 1024 * 1024;

export default function Admin() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [product, setProduct] = useState<CatalogProduct>(blankProduct);
  const [category, setCategory] = useState<CatalogCategory>(blankCategory);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [savingProduct, setSavingProduct] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [visitStats, setVisitStats] = useState<VisitStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const productEditorRef = useRef<HTMLElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const load = async () => {
    const result = await getCatalog();
    setProducts(result.products);
    setCategories(result.categories);
  };

  const loadVisitStats = async () => {
    setLoadingStats(true);
    try {
      const analyticsRef = collection(db, 'analytics');
      const [totalSnap, areaSnaps, pageSnaps] = await Promise.all([
        getCountFromServer(query(analyticsRef, where('type', '==', 'page_view'))),
        Promise.all(Object.keys(AREA_LABELS).map((key) => getCountFromServer(query(analyticsRef, where('key', '==', `area:${key}`))))),
        Promise.all(Object.keys(PAGE_LABELS).map((key) => getCountFromServer(query(analyticsRef, where('key', '==', `page:${key}`))))),
      ]);
      const areas = Object.keys(AREA_LABELS)
        .map((key, i) => ({ key, label: AREA_LABELS[key], count: areaSnaps[i].data().count }))
        .sort((a, b) => b.count - a.count);
      const pages = Object.keys(PAGE_LABELS)
        .map((key, i) => ({ key, label: PAGE_LABELS[key], count: pageSnaps[i].data().count }))
        .sort((a, b) => b.count - a.count);
      setVisitStats({ totalViews: totalSnap.data().count, areas, pages });
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) { setLoading(false); return; }
      try {
        const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
        setIsAdmin(adminDoc.exists() && adminDoc.data()?.enabled === true);
        if (adminDoc.exists() && adminDoc.data()?.enabled === true) await Promise.all([load(), loadVisitStats()]);
      } catch (error) {
        console.error(error);
        setIsAdmin(false);
      } finally { setLoading(false); }
    });
    return unsubscribe;
  }, []);

  useEffect(() => () => {
    if (imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  const categoryNames = useMemo(() => categories.map((item) => item.name), [categories]);

  const resetImageSelection = () => {
    setSelectedImage(null);
    setImagePreview(product.image || '');
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const editProduct = (item: CatalogProduct) => {
    setProduct(item);
    setSelectedImage(null);
    setSelectedVideo(null);
    setVideoProgress(0);
    setImagePreview(item.image || '');
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
    requestAnimationFrame(() => productEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const chooseImage = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setMessage('Selecciona una imagen válida.');
    if (file.size > MAX_IMAGE_SIZE) return setMessage('La imagen no puede superar 15 MB.');
    if (imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
    setMessage('Imagen seleccionada. Pulsa “Guardar producto” para subirla a Cloudflare R2.');
  };

  const chooseVideo = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('video/')) return setMessage('Selecciona un archivo de video válido.');
    if (file.size > MAX_VIDEO_SIZE) return setMessage('El video no puede superar 1 GB.');
    setSelectedVideo(file);
    setVideoProgress(0);
    setMessage(`Video seleccionado: ${file.name}. Pulsa “Subir video a R2”.`);
  };

  const uploadVideoToR2 = async () => {
    if (!selectedVideo || !product.id || !product.category) return setMessage('Primero selecciona un producto y una categoría.');
    if (!user) return setMessage('Tu sesión expiró. Vuelve a iniciar sesión.');

    setUploadingVideo(true);
    setVideoProgress(0);
    setMessage('Preparando subida segura a Cloudflare R2…');

    try {
      const token = await user.getIdToken();
      const categoryRecord = categories.find((item) => item.name === product.category);
      const response = await fetch('/api/admin/r2-video-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          filename: selectedVideo.name,
          contentType: selectedVideo.type,
          size: selectedVideo.size,
          categorySlug: categoryRecord?.slug || slugifyCatalog(product.category),
          productId: product.id,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'No se pudo preparar la subida.');

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', payload.uploadUrl);
        xhr.setRequestHeader('Content-Type', selectedVideo.type);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) setVideoProgress(Math.round((event.loaded / event.total) * 100));
        };
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`R2 respondió ${xhr.status}.`));
        xhr.onerror = () => reject(new Error('La conexión con Cloudflare R2 falló.'));
        xhr.send(selectedVideo);
      });

      const productToSave: CatalogProduct = {
        ...product,
        videoProvider: 'mp4',
        videoUrl: payload.publicUrl,
        videoPath: payload.key,
        videoMimeType: selectedVideo.type,
        videoSize: selectedVideo.size,
        videoOriginalName: selectedVideo.name,
        videoStorage: 'r2',
      };
      await saveProduct(productToSave);
      await load();
      setProduct(productToSave);
      setSelectedVideo(null);
      if (videoInputRef.current) videoInputRef.current.value = '';
      setVideoProgress(100);
      setMessage('✅ Video subido a R2 y producto actualizado correctamente.');
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : 'No se pudo subir el video a R2.');
    } finally {
      setUploadingVideo(false);
    }
  };

  const saveProductForm = async () => {
    if (!product.id || !product.name || !product.category) return setMessage('Completa ID, nombre y categoría.');
    setSavingProduct(true);
    setMessage('Guardando producto…');
    try {
      let productToSave: CatalogProduct = {
        ...product,
        price: Number(product.price),
        sortOrder: Number(product.sortOrder),
        videoUrl: product.videoUrl?.trim() || '',
        videoProvider: product.videoUrl?.trim() ? product.videoProvider : undefined,
      };
      if (selectedImage) {
        const uploaded = await uploadProductImage(product.id, selectedImage);
        productToSave = { ...productToSave, image: uploaded.image };
      }
      await saveProduct(productToSave);
      await load();
      setProduct(productToSave);
      setSelectedImage(null);
      setImagePreview(productToSave.image || '');
      if (imageInputRef.current) imageInputRef.current.value = '';
      setMessage(selectedImage ? '✅ Producto guardado y nueva imagen subida a Cloudflare R2 correctamente.' : 'Producto guardado.');
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : 'No se pudo guardar el producto o subir la imagen a Cloudflare R2.');
    } finally { setSavingProduct(false); }
  };

  const newProduct = () => {
    setProduct(blankProduct); setSelectedImage(null); setSelectedVideo(null); setImagePreview(''); setVideoProgress(0);
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const saveCategoryForm = async () => {
    if (!category.id || !category.name) return setMessage('Completa ID y nombre de categoría.');
    await saveCategory({ ...category, slug: category.slug || slugifyCatalog(category.name), sortOrder: Number(category.sortOrder) });
    await load(); setCategory(blankCategory); setMessage('Categoría guardada.');
  };

  const initialize = async () => { await seedCatalog(); await load(); setMessage('Catálogo inicial sincronizado con Firestore.'); };

  if (loading) return <main className="container" style={{ padding: '80px 0' }}><h1>Panel de administración</h1><p>Cargando permisos…</p></main>;
  if (!user) return <main className="container" style={{ padding: '80px 0' }}><h1>Panel de administración</h1><p>Inicia sesión para continuar.</p><a className="btn primary" href="/login">Entrar</a></main>;
  if (!isAdmin) return <main className="container" style={{ padding: '80px 0', maxWidth: 760 }}><span className="eyebrow">Acceso protegido</span><h1>Cuenta sin permisos de administración</h1><p>Tu cuenta está autenticada, pero no tiene el documento <code>admins/{user.uid}</code> con <code>enabled: true</code> en Firestore.</p><a className="btn secondary" href="/">Volver al catálogo</a></main>;

  return <main className="container" style={{ padding: '50px 0 90px' }}>
    <span className="eyebrow">Admin • Firestore + Cloudflare R2</span><h1>Catálogo Club BASA</h1><p>Productos, categorías, precios, imágenes y videos se administran desde aquí.</p>
    {message && <div className="card" style={{ margin: '18px 0' }}>{message}</div>}

    <section style={{ padding: '25px 0' }}><div className="card">
      <h2>Visitas del sitio</h2>
      <p style={{ color: '#6b7280', margin: '4px 0 14px' }}>Conteo interno de visitas por página y sección. No incluye direcciones IP ni datos de inicio de sesión.</p>
      {loadingStats ? <p>Cargando estadísticas…</p> : visitStats ? <>
        <p><strong>{visitStats.totalViews}</strong> visitas totales registradas.</p>
        <div className="grid3" style={{ marginTop: 14 }}>
          <div><h3 style={{ fontSize: 16 }}>Áreas más visitadas</h3><ul style={{ margin: 0, paddingLeft: 18 }}>{visitStats.areas.map((a) => <li key={a.key}>{a.label}: {a.count}</li>)}</ul></div>
          <div><h3 style={{ fontSize: 16 }}>Páginas más visitadas</h3><ul style={{ margin: 0, paddingLeft: 18 }}>{visitStats.pages.map((p) => <li key={p.key}>{p.label}: {p.count}</li>)}</ul></div>
        </div>
      </> : <p>Sin datos todavía.</p>}
    </div></section>

    <section style={{ padding: '25px 0' }}><div className="card"><h2>Primera configuración</h2><p>Si Firestore está vacío, carga los productos actuales como punto de partida.</p><button type="button" className="btn primary" onClick={initialize}>Sincronizar catálogo inicial</button></div></section>

    <section style={{ padding: '25px 0' }}><div className="sectionHead"><h2>Productos</h2><p>{products.length} productos en Firestore.</p></div><div className="grid3">{products.map((item) => <div className="card" key={item.id}>
      <strong>{item.name}</strong><p>{item.category} · ${item.price}</p>
      {item.image ? <div style={{ width: '100%', aspectRatio: '16 / 9', marginTop: 10, borderRadius: 12, overflow: 'hidden', border: '1px solid #eadfd4', background: '#fff8ef', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><img src={item.image} alt={item.name} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }} /></div> : <div style={{ width: '100%', aspectRatio: '16 / 9', marginTop: 10, borderRadius: 12, border: '1px solid #eadfd4', background: '#fff8ef', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>Sin imagen</div>}
      <small>{item.videoUrl ? `Video: ${item.videoStorage === 'r2' ? 'Cloudflare R2' : item.videoProvider || 'embed'}` : 'Sin video'}</small><br/><small>{item.active ? 'Activo' : 'Inactivo'}</small><div style={{ display: 'flex', gap: 8, marginTop: 12 }}><button type="button" className="btn secondary" onClick={() => editProduct(item)}>Editar</button><button type="button" className="btn secondary" onClick={async () => { await removeProduct(item.id); await load(); }}>Eliminar</button></div>
    </div>)}</div></section>

    <section ref={productEditorRef} style={{ padding: '25px 0', scrollMarginTop: 20 }}><div className="card"><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}><h2>{product.id ? 'Editar producto' : 'Nuevo producto'}</h2>{product.id && <button type="button" className="btn secondary" onClick={newProduct}>Nuevo producto</button>}</div><div className="grid3">
      <div className="field"><label>ID único</label><input value={product.id} onChange={(e) => setProduct({ ...product, id: e.target.value.trim().toLowerCase().replace(/\s+/g, '-') })} placeholder="six" /></div>
      <div className="field"><label>Nombre</label><input value={product.name} onChange={(e) => setProduct({ ...product, name: e.target.value })} /></div>
      <div className="field"><label>Categoría</label><select value={product.category} onChange={(e) => setProduct({ ...product, category: e.target.value })}><option value="">Seleccionar</option>{categoryNames.map((name) => <option key={name}>{name}</option>)}</select></div>
      <div className="field"><label>Precio</label><input type="number" min="0" value={product.price} onChange={(e) => setProduct({ ...product, price: Number(e.target.value) })} /></div>
      <div className="field"><label>Disponibilidad</label><input value={product.availability || ''} onChange={(e) => setProduct({ ...product, availability: e.target.value })} placeholder="Sobre pedido" /></div>
      <div className="field"><label>Orden</label><input type="number" value={product.sortOrder} onChange={(e) => setProduct({ ...product, sortOrder: Number(e.target.value) })} /></div>
    </div><div className="field"><label>Descripción</label><textarea value={product.description} onChange={(e) => setProduct({ ...product, description: e.target.value })} rows={3}/></div>

    <div className="field" style={{ marginTop: 18 }}><label>Imagen del producto</label><div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
      {imagePreview && <img src={imagePreview} alt="Vista previa" style={{ width: 220, maxWidth: '100%', aspectRatio: '16 / 9', objectFit: 'contain', background: '#fff8ef', borderRadius: 12, border: '1px solid #ddd' }} />}
      <div><input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif" onChange={(e) => chooseImage(e.target.files?.[0])} style={{ display: 'none' }} /><button type="button" className="btn secondary" onClick={() => imageInputRef.current?.click()}>Cargar imagen</button><p style={{ margin: '8px 0 0', fontSize: 14, color: '#6b7280' }}>JPG, PNG, WEBP, AVIF, HEIC/HEIF. Máximo 15 MB. Se almacena en Cloudflare R2.</p>{selectedImage && <small>Seleccionada: {selectedImage.name} · {(selectedImage.size / 1024 / 1024).toFixed(1)} MB</small>}</div>
    </div></div>

    <div className="field" style={{ marginTop: 24 }}><label>Video del producto</label>
      <div className="card" style={{ marginTop: 10, background: '#fffaf5' }}><strong>☁️ Cloudflare R2</strong><p style={{ margin: '8px 0' }}>Sube el MP4 directamente desde esta aplicación. Se guardará automáticamente dentro de la categoría y producto.</p>
        <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime,video/x-m4v,video/*" onChange={(e) => chooseVideo(e.target.files?.[0])} style={{ display: 'none' }} />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}><button type="button" className="btn secondary" onClick={() => videoInputRef.current?.click()} disabled={uploadingVideo}>Seleccionar video</button><button type="button" className="btn primary" onClick={uploadVideoToR2} disabled={!selectedVideo || uploadingVideo}>{uploadingVideo ? `Subiendo ${videoProgress}%…` : 'Subir video a R2'}</button></div>
        {selectedVideo && <p style={{ margin: '10px 0 0', fontSize: 14 }}><strong>{selectedVideo.name}</strong> · {(selectedVideo.size / 1024 / 1024).toFixed(1)} MB</p>}
        {uploadingVideo && <div style={{ marginTop: 10, height: 8, borderRadius: 99, background: '#eadfd4', overflow: 'hidden' }}><div style={{ width: `${videoProgress}%`, height: '100%', background: '#f58212', transition: 'width .15s' }} /></div>}
        {product.videoStorage === 'r2' && product.videoUrl && <div style={{ marginTop: 12 }}><small>Video actual en R2:</small><br/><a href={product.videoUrl} target="_blank" rel="noreferrer">{product.videoPath || product.videoUrl}</a></div>}
        <small style={{ display: 'block', marginTop: 8, color: '#6b7280' }}>Máximo 1 GB. La carga usa una URL temporal para que el archivo vaya directamente al bucket sin pasar por Vercel.</small>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 14, fontSize: 14, cursor: 'pointer' }}><input type="checkbox" checked={product.videoDownloadable !== false} onChange={(e) => setProduct({ ...product, videoDownloadable: e.target.checked })} /> Permitir que los clientes descarguen este video</label>
      </div>

      <div className="card" style={{ marginTop: 12, background: '#fffaf5' }}><strong>Fuentes externas</strong><p style={{ marginBottom: 8 }}>YouTube · Google Drive · Vimeo · Hotmart · Udemy · MP4 · HLS (.m3u8) · Otro / iframe.</p><div className="grid3"><div className="field"><label>Fuente</label><select value={product.videoStorage === 'r2' ? 'r2' : product.videoProvider || ''} onChange={(e) => { const value = e.target.value; setProduct({ ...product, videoStorage: value === 'r2' ? 'r2' : 'external', videoProvider: value === 'r2' ? 'mp4' : (value || undefined) as CatalogProduct['videoProvider'] }); }}><option value="">Sin video externo</option><option value="r2">Cloudflare R2</option>{productVideoProviders.map((provider) => <option key={provider.value} value={provider.value}>{provider.label}</option>)}</select></div><div className="field" style={{ gridColumn: 'span 2' }}><label>URL del video</label><input value={product.videoUrl || ''} onChange={(e) => setProduct({ ...product, videoUrl: e.target.value, videoStorage: 'external' })} placeholder="https://..." /></div></div></div>
    </div>

    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 18 }}><button type="button" className="btn primary" onClick={saveProductForm} disabled={savingProduct || uploadingVideo}>{savingProduct ? 'Guardando…' : 'Guardar producto'}</button>{selectedImage && <button type="button" className="btn secondary" onClick={resetImageSelection} disabled={savingProduct}>Cancelar imagen</button>}</div></div></section>

    <section style={{ padding: '25px 0' }}><div className="sectionHead"><h2>Categorías</h2><p>{categories.length} categorías en Firestore.</p></div><div className="grid3">{categories.map((item) => <div className="card" key={item.id}><strong>{item.name}</strong><p>{item.slug}</p><div style={{ display: 'flex', gap: 8 }}><button type="button" className="btn secondary" onClick={() => setCategory(item)}>Editar</button><button type="button" className="btn secondary" onClick={async () => { await removeCategory(item.id); await load(); }}>Eliminar</button></div></div>)}</div><div className="card" style={{ marginTop: 18 }}><h3>{category.id ? 'Editar categoría' : 'Nueva categoría'}</h3><div className="grid3"><div className="field"><label>ID</label><input value={category.id} onChange={(e) => setCategory({ ...category, id: e.target.value.trim().toLowerCase().replace(/\s+/g, '-') })}/></div><div className="field"><label>Nombre</label><input value={category.name} onChange={(e) => setCategory({ ...category, name: e.target.value })}/></div><div className="field"><label>Orden</label><input type="number" value={category.sortOrder} onChange={(e) => setCategory({ ...category, sortOrder: Number(e.target.value) })}/></div></div><button type="button" className="btn primary" onClick={saveCategoryForm}>Guardar categoría</button></div></section>
    <p><a href="/">← Volver al catálogo</a></p>
  </main>;
}
