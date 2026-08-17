'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { getCatalog, removeCategory, removeProduct, removeProductImage, saveCategory, saveProduct, seedCatalog, type CatalogCategory, type CatalogProduct, uploadProductImage } from '@/lib/catalog';

const blankProduct: CatalogProduct = { id: '', name: '', category: '', price: 0, description: '', availability: '', active: true, featured: false, sortOrder: 0 };
const blankCategory: CatalogCategory = { id: '', name: '', slug: '', active: true, sortOrder: 0 };
const MAX_IMAGE_SIZE = 15 * 1024 * 1024;

export default function Admin() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [product, setProduct] = useState<CatalogProduct>(blankProduct);
  const [category, setCategory] = useState<CatalogCategory>(blankCategory);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [savingProduct, setSavingProduct] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const productEditorRef = useRef<HTMLElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const load = async () => {
    const result = await getCatalog();
    setProducts(result.products);
    setCategories(result.categories);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) { setLoading(false); return; }
      try {
        const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
        setIsAdmin(adminDoc.exists() && adminDoc.data()?.enabled === true);
        if (adminDoc.exists() && adminDoc.data()?.enabled === true) await load();
      } catch (error) {
        console.error(error);
        setIsAdmin(false);
      } finally { setLoading(false); }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    };
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
    setImagePreview(item.image || '');
    if (imageInputRef.current) imageInputRef.current.value = '';
    requestAnimationFrame(() => productEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const chooseImage = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setMessage('Selecciona una imagen válida.');
    if (file.size > MAX_IMAGE_SIZE) return setMessage('La imagen no puede superar 15 MB.');

    if (imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
    setMessage('Imagen de alta calidad seleccionada. Pulsa “Guardar producto” para subirla y reemplazar la anterior.');
  };

  const saveProductForm = async () => {
    if (!product.id || !product.name || !product.category) return setMessage('Completa ID, nombre y categoría.');
    setSavingProduct(true);
    setMessage('Guardando producto…');

    let uploadedPath = '';
    try {
      let productToSave = { ...product, price: Number(product.price), sortOrder: Number(product.sortOrder) };
      const oldImagePath = product.imagePath;

      if (selectedImage) {
        const uploaded = await uploadProductImage(product.id, selectedImage);
        uploadedPath = uploaded.imagePath;
        productToSave = { ...productToSave, image: uploaded.image, imagePath: uploaded.imagePath };
      }

      await saveProduct(productToSave);

      if (selectedImage && oldImagePath && oldImagePath !== productToSave.imagePath) {
        try {
          await removeProductImage(oldImagePath);
        } catch (cleanupError) {
          console.warn('No se pudo eliminar la imagen anterior:', cleanupError);
        }
      }

      await load();
      setProduct(productToSave);
      setSelectedImage(null);
      setImagePreview(productToSave.image || '');
      if (imageInputRef.current) imageInputRef.current.value = '';
      setMessage(selectedImage ? 'Producto guardado y nueva imagen reemplazada correctamente.' : 'Producto guardado.');
    } catch (error) {
      console.error(error);
      if (uploadedPath) {
        try { await removeProductImage(uploadedPath); } catch (cleanupError) { console.warn(cleanupError); }
      }
      setMessage('No se pudo guardar. Revisa que Firebase Storage esté habilitado y que tengas permisos de administrador.');
    } finally {
      setSavingProduct(false);
    }
  };

  const newProduct = () => {
    setProduct(blankProduct);
    setSelectedImage(null);
    setImagePreview('');
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const saveCategoryForm = async () => {
    if (!category.id || !category.name) return setMessage('Completa ID y nombre de categoría.');
    await saveCategory({ ...category, slug: category.slug || category.id, sortOrder: Number(category.sortOrder) });
    await load(); setCategory(blankCategory); setMessage('Categoría guardada.');
  };

  const initialize = async () => { await seedCatalog(); await load(); setMessage('Catálogo inicial sincronizado con Firestore.'); };

  if (loading) return <main className="container" style={{ padding: '80px 0' }}><h1>Panel de administración</h1><p>Cargando permisos…</p></main>;
  if (!user) return <main className="container" style={{ padding: '80px 0' }}><h1>Panel de administración</h1><p>Inicia sesión para continuar.</p><a className="btn primary" href="/login">Entrar</a></main>;
  if (!isAdmin) return <main className="container" style={{ padding: '80px 0', maxWidth: 760 }}><span className="eyebrow">Acceso protegido</span><h1>Cuenta sin permisos de administración</h1><p>Tu cuenta está autenticada, pero no tiene el documento <code>admins/{user.uid}</code> con <code>enabled: true</code> en Firestore.</p><a className="btn secondary" href="/">Volver al catálogo</a></main>;

  return <main className="container" style={{ padding: '50px 0 90px' }}>
    <span className="eyebrow">Admin • Firestore + Storage</span><h1>Catálogo Club BASA</h1><p>Productos, categorías, precios e imágenes se administran desde aquí.</p>
    {message && <div className="card" style={{ margin: '18px 0' }}>{message}</div>}

    <section style={{ padding: '25px 0' }}><div className="card"><h2>Primera configuración</h2><p>Si Firestore está vacío, carga los productos actuales como punto de partida.</p><button type="button" className="btn primary" onClick={initialize}>Sincronizar catálogo inicial</button></div></section>

    <section style={{ padding: '25px 0' }}><div className="sectionHead"><h2>Productos</h2><p>{products.length} productos en Firestore.</p></div><div className="grid3">{products.map((item) => <div className="card" key={item.id}><strong>{item.name}</strong><p>{item.category} · ${item.price}</p>{item.image && <img src={item.image} alt={item.name} style={{ width: '100%', height: 130, objectFit: 'cover', borderRadius: 12, marginTop: 10 }} />}<small>{item.active ? 'Activo' : 'Inactivo'}</small><div style={{ display: 'flex', gap: 8, marginTop: 12 }}><button type="button" className="btn secondary" onClick={() => editProduct(item)}>Editar</button><button type="button" className="btn secondary" onClick={async () => { await removeProduct(item.id); await load(); }}>Eliminar</button></div></div>)}</div></section>

    <section ref={productEditorRef} style={{ padding: '25px 0', scrollMarginTop: 20 }}><div className="card"><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}><h2>{product.id ? 'Editar producto' : 'Nuevo producto'}</h2>{product.id && <button type="button" className="btn secondary" onClick={newProduct}>Nuevo producto</button>}</div><div className="grid3">
      <div className="field"><label>ID único</label><input value={product.id} onChange={(e) => setProduct({ ...product, id: e.target.value.trim().toLowerCase().replace(/\s+/g, '-') })} placeholder="six" /></div>
      <div className="field"><label>Nombre</label><input value={product.name} onChange={(e) => setProduct({ ...product, name: e.target.value })} /></div>
      <div className="field"><label>Categoría</label><select value={product.category} onChange={(e) => setProduct({ ...product, category: e.target.value })}><option value="">Seleccionar</option>{categoryNames.map((name) => <option key={name}>{name}</option>)}</select></div>
      <div className="field"><label>Precio</label><input type="number" min="0" value={product.price} onChange={(e) => setProduct({ ...product, price: Number(e.target.value) })} /></div>
      <div className="field"><label>Disponibilidad</label><input value={product.availability || ''} onChange={(e) => setProduct({ ...product, availability: e.target.value })} placeholder="Sobre pedido" /></div>
      <div className="field"><label>Orden</label><input type="number" value={product.sortOrder} onChange={(e) => setProduct({ ...product, sortOrder: Number(e.target.value) })} /></div>
    </div><div className="field"><label>Descripción</label><textarea value={product.description} onChange={(e) => setProduct({ ...product, description: e.target.value })} rows={3}/></div>

    <div className="field" style={{ marginTop: 18 }}><label>Imagen del producto</label>
      <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        {imagePreview && <img src={imagePreview} alt="Vista previa" style={{ width: 150, height: 110, objectFit: 'cover', borderRadius: 12, border: '1px solid #ddd' }} />}
        <div>
          <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif" onChange={(e) => chooseImage(e.target.files?.[0])} style={{ display: 'none' }} />
          <button type="button" className="btn secondary" onClick={() => imageInputRef.current?.click()}>Cargar imagen</button>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: '#6b7280' }}>JPG, PNG, WEBP, AVIF, HEIC/HEIF. Máximo 15 MB. Se conserva la resolución y calidad original.</p>
          {selectedImage && <small>Seleccionada: {selectedImage.name} · {(selectedImage.size / 1024 / 1024).toFixed(1)} MB</small>}
        </div>
      </div>
    </div>

    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 18 }}><button type="button" className="btn primary" onClick={saveProductForm} disabled={savingProduct}>{savingProduct ? 'Guardando…' : 'Guardar producto'}</button>{selectedImage && <button type="button" className="btn secondary" onClick={resetImageSelection} disabled={savingProduct}>Cancelar imagen</button>}</div></div></section>

    <section style={{ padding: '25px 0' }}><div className="sectionHead"><h2>Categorías</h2><p>{categories.length} categorías en Firestore.</p></div><div className="grid3">{categories.map((item) => <div className="card" key={item.id}><strong>{item.name}</strong><p>{item.slug}</p><div style={{ display: 'flex', gap: 8 }}><button type="button" className="btn secondary" onClick={() => setCategory(item)}>Editar</button><button type="button" className="btn secondary" onClick={async () => { await removeCategory(item.id); await load(); }}>Eliminar</button></div></div>)}</div><div className="card" style={{ marginTop: 18 }}><h3>{category.id ? 'Editar categoría' : 'Nueva categoría'}</h3><div className="grid3"><div className="field"><label>ID</label><input value={category.id} onChange={(e) => setCategory({ ...category, id: e.target.value.trim().toLowerCase().replace(/\s+/g, '-') })}/></div><div className="field"><label>Nombre</label><input value={category.name} onChange={(e) => setCategory({ ...category, name: e.target.value })}/></div><div className="field"><label>Orden</label><input type="number" value={category.sortOrder} onChange={(e) => setCategory({ ...category, sortOrder: Number(e.target.value) })}/></div></div><button type="button" className="btn primary" onClick={saveCategoryForm}>Guardar categoría</button></div></section>

    <p><a href="/">← Volver al catálogo</a></p>
  </main>;
}
