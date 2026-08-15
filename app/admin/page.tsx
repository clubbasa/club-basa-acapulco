'use client';

import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { getCatalog, getFallbackCategories, getFallbackProducts, removeCategory, removeProduct, saveCategory, saveProduct, seedCatalog, type CatalogCategory, type CatalogProduct } from '@/lib/catalog';

const blankProduct: CatalogProduct = { id: '', name: '', category: '', price: 0, description: '', availability: '', active: true, featured: false, sortOrder: 0 };
const blankCategory: CatalogCategory = { id: '', name: '', slug: '', active: true, sortOrder: 0 };

export default function Admin() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [product, setProduct] = useState<CatalogProduct>(blankProduct);
  const [category, setCategory] = useState<CatalogCategory>(blankCategory);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

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

  const categoryNames = useMemo(() => categories.map((item) => item.name), [categories]);

  if (loading) return <main className="container" style={{ padding: '80px 0' }}><h1>Panel de administración</h1><p>Cargando permisos…</p></main>;
  if (!user) return <main className="container" style={{ padding: '80px 0' }}><h1>Panel de administración</h1><p>Inicia sesión para continuar.</p><a className="btn primary" href="/login">Entrar</a></main>;
  if (!isAdmin) return <main className="container" style={{ padding: '80px 0', maxWidth: 760 }}><span className="eyebrow">Acceso protegido</span><h1>Cuenta sin permisos de administración</h1><p>Tu cuenta está autenticada, pero no tiene el documento <code>admins/{user.uid}</code> con <code>enabled: true</code> en Firestore. Esto evita que cualquier cliente registrado pueda cambiar precios.</p><a className="btn secondary" href="/">Volver al catálogo</a></main>;

  const saveProductForm = async () => {
    if (!product.id || !product.name || !product.category) return setMessage('Completa ID, nombre y categoría.');
    await saveProduct({ ...product, price: Number(product.price), sortOrder: Number(product.sortOrder) });
    await load(); setProduct(blankProduct); setMessage('Producto guardado.');
  };
  const saveCategoryForm = async () => {
    if (!category.id || !category.name) return setMessage('Completa ID y nombre de categoría.');
    await saveCategory({ ...category, slug: category.slug || category.id, sortOrder: Number(category.sortOrder) });
    await load(); setCategory(blankCategory); setMessage('Categoría guardada.');
  };
  const initialize = async () => { await seedCatalog(); await load(); setMessage('Catálogo inicial sincronizado con Firestore.'); };

  return <main className="container" style={{ padding: '50px 0 90px' }}>
    <span className="eyebrow">Admin • Firestore</span><h1>Catálogo Club BASA</h1><p>Productos, categorías y precios se editan aquí. Los cambios aparecen en la landing sin modificar código.</p>
    {message && <div className="card" style={{ margin: '18px 0' }}>{message}</div>}
    <section style={{ padding: '25px 0' }}><div className="card"><h2>Primera configuración</h2><p>Si Firestore está vacío, carga los productos actuales como punto de partida. Después podrás editarlos desde este panel.</p><button className="btn primary" onClick={initialize}>Sincronizar catálogo inicial</button></div></section>

    <section style={{ padding: '25px 0' }}><div className="sectionHead"><h2>Productos</h2><p>{products.length} productos en Firestore.</p></div><div className="grid3">{products.map((item) => <div className="card" key={item.id}><strong>{item.name}</strong><p>{item.category} · ${item.price}</p><small>{item.active ? 'Activo' : 'Inactivo'}</small><div style={{ display: 'flex', gap: 8, marginTop: 12 }}><button className="btn secondary" onClick={() => setProduct(item)}>Editar</button><button className="btn secondary" onClick={async () => { await removeProduct(item.id); await load(); }}>Eliminar</button></div></div>)}</div></section>

    <section style={{ padding: '25px 0' }}><div className="card"><h2>{product.id ? 'Editar producto' : 'Nuevo producto'}</h2><div className="grid3">
      <div className="field"><label>ID único</label><input value={product.id} onChange={(e) => setProduct({ ...product, id: e.target.value.trim().toLowerCase().replace(/\s+/g, '-') })} placeholder="six" /></div>
      <div className="field"><label>Nombre</label><input value={product.name} onChange={(e) => setProduct({ ...product, name: e.target.value })} /></div>
      <div className="field"><label>Categoría</label><select value={product.category} onChange={(e) => setProduct({ ...product, category: e.target.value })}><option value="">Seleccionar</option>{categoryNames.map((name) => <option key={name}>{name}</option>)}</select></div>
      <div className="field"><label>Precio</label><input type="number" min="0" value={product.price} onChange={(e) => setProduct({ ...product, price: Number(e.target.value) })} /></div>
      <div className="field"><label>Disponibilidad</label><input value={product.availability || ''} onChange={(e) => setProduct({ ...product, availability: e.target.value })} placeholder="Sobre pedido" /></div>
      <div className="field"><label>Orden</label><input type="number" value={product.sortOrder} onChange={(e) => setProduct({ ...product, sortOrder: Number(e.target.value) })} /></div>
    </div><div className="field"><label>Descripción</label><textarea value={product.description} onChange={(e) => setProduct({ ...product, description: e.target.value })} rows={3}/></div><div className="field"><label>URL de imagen opcional</label><input value={product.image || ''} onChange={(e) => setProduct({ ...product, image: e.target.value })} placeholder="https://..." /></div><button className="btn primary" onClick={saveProductForm}>Guardar producto</button></div></section>

    <section style={{ padding: '25px 0' }}><div className="sectionHead"><h2>Categorías</h2><p>{categories.length} categorías en Firestore.</p></div><div className="grid3">{categories.map((item) => <div className="card" key={item.id}><strong>{item.name}</strong><p>{item.slug}</p><div style={{ display: 'flex', gap: 8 }}><button className="btn secondary" onClick={() => setCategory(item)}>Editar</button><button className="btn secondary" onClick={async () => { await removeCategory(item.id); await load(); }}>Eliminar</button></div></div>)}</div><div className="card" style={{ marginTop: 18 }}><h3>{category.id ? 'Editar categoría' : 'Nueva categoría'}</h3><div className="grid3"><div className="field"><label>ID</label><input value={category.id} onChange={(e) => setCategory({ ...category, id: e.target.value.trim().toLowerCase().replace(/\s+/g, '-') })}/></div><div className="field"><label>Nombre</label><input value={category.name} onChange={(e) => setCategory({ ...category, name: e.target.value })}/></div><div className="field"><label>Orden</label><input type="number" value={category.sortOrder} onChange={(e) => setCategory({ ...category, sortOrder: Number(e.target.value) })}/></div></div><button className="btn primary" onClick={saveCategoryForm}>Guardar categoría</button></div></section>

    <p><a href="/">← Volver al catálogo</a></p>
  </main>;
}
