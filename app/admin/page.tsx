'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { collection, deleteDoc, doc, getCountFromServer, getDoc, getDocs, limit, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { getCatalog, removeCategory, removeProduct, saveCategory, saveProduct, slugifyCatalog, type CatalogCategory, type CatalogProduct, uploadProductImage } from '@/lib/catalog';
import { getPromotions, removePromotion, savePromotion, uploadPromotionImage, type Promotion, type PromotionType } from '@/lib/promotions';
import { productVideoProviders } from '@/lib/video';
import { waLinkTo } from '@/lib/whatsapp';
import { getSiteSettings, updateSiteSettings } from '@/lib/settings';
import { getOptionGroups, getProductOptions, saveOptionGroup, removeOptionGroup, saveProductOption, removeProductOption, type OptionGroup, type ProductOption, type SelectionMode } from '@/lib/options';

const AREA_LABELS: Record<string, string> = { hero: 'Hero', 'producto-estrella': 'Producto estrella', desayuno: 'Arma tu desayuno', categorias: 'Categorías', menu: 'Catálogo', experiencia: 'Experiencia', pedido: 'Pedido (CTA final)' };
const CTA_LABELS: Record<string, string> = { header_order: 'Header · Pedir', hero_order: 'Hero · Pedir ahora', hero_menu: 'Hero · Ver menú', six_order: 'Six · Quiero mi six', breakfast_order: 'Desayuno · Armar', menu_explore: 'Categorías · Ver menú', final_order: 'Cierre · Pedir', final_menu: 'Cierre · Ver menú', sticky_order: 'Sticky móvil · Pedir', envios_cotizar: 'Envíos · Cotizar', experiencia_contacto: 'Experiencia · WhatsApp' };
const PRODUCT_ID_LABELS: Record<string, string> = { six: 'Six de panquecitos', single: 'Panquecito individual', waffle: 'Waffle', crepa: 'Crepa', shake: 'Malteada', special: 'Especialidad de malteada', tea: 'Té', aloe: 'Aloe', fiber: 'Fibra', fruit: 'Ponche de frutas', rolls: 'Rollitos salados', coffee: 'Café grano arábica', menu: 'Poster de menú' };
const PAGE_LABELS: Record<string, string> = { '/': 'Inicio', '/blog': 'Blog', '/blog/panquecitos-acapulco': 'Blog · Panquecitos', '/blog/menu-club-basa': 'Blog · Menú', '/blog/envios-acapulco': 'Blog · Envíos' };
type VisitStats = {
  totalViews: number;
  areas: { key: string; label: string; count: number }[];
  pages: { key: string; label: string; count: number }[];
  ctas: { key: string; label: string; count: number }[];
  productViews: { key: string; label: string; count: number }[];
  addToCarts: { key: string; label: string; count: number }[];
  beginOrders: number;
};
type CustomerAccount = { uid: string; name?: string; email?: string; whatsapp?: string; enabled?: boolean; tag?: string };
type ContactMessage = { id: string; name?: string; contact?: string; message?: string; createdAt?: { toDate: () => Date } };
const PROMOTION_TYPE_LABELS: Record<PromotionType, string> = { promo: 'Promoción', evento: 'Evento', video: 'Video', imagen: 'Imagen' };

const blankProduct: CatalogProduct = { id: '', name: '', category: '', price: 0, description: '', availability: '', active: true, sortOrder: 0, videoProvider: undefined, videoUrl: '', videoStorage: undefined, videoDownloadable: true };
const blankCategory: CatalogCategory = { id: '', name: '', slug: '', active: true, sortOrder: 0 };
const blankPromotion: Promotion = { id: '', title: '', description: '', type: 'promo', active: true, sortOrder: 0 };
const MAX_IMAGE_SIZE = 15 * 1024 * 1024;
const MAX_VIDEO_SIZE = 1024 * 1024 * 1024;
const SELECTION_MODE_LABELS: Record<SelectionMode, string> = { single: 'Una sola opción', multiple: 'Repartir cantidad entre opciones' };
const blankOptionGroup: OptionGroup = { id: '', productId: '', label: '', selectionMode: 'single', required: false, minSelections: 0, maxSelections: 1, allowDuplicates: false, sortOrder: 0, active: true };
const blankProductOption: ProductOption = { id: '', groupId: '', productId: '', label: '', priceDelta: 0, active: true, available: true, sortOrder: 0 };

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
  const [customers, setCustomers] = useState<CustomerAccount[]>([]);
  const [customerTagFilter, setCustomerTagFilter] = useState('Todos');
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [promotion, setPromotion] = useState<Promotion>(blankPromotion);
  const [selectedPromotionImage, setSelectedPromotionImage] = useState<File | null>(null);
  const [promotionImagePreview, setPromotionImagePreview] = useState('');
  const [savingPromotion, setSavingPromotion] = useState(false);
  const [adminProfile, setAdminProfile] = useState<{ name?: string; whatsapp?: string } | null>(null);
  const [editAdminName, setEditAdminName] = useState('');
  const [editAdminWhatsapp, setEditAdminWhatsapp] = useState('');
  const [savingAdminProfile, setSavingAdminProfile] = useState(false);
  const [adminProfileMsg, setAdminProfileMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [adminProfileOpen, setAdminProfileOpen] = useState(false);
  const [imagesDownloadable, setImagesDownloadable] = useState(false);
  const [savingSiteSettings, setSavingSiteSettings] = useState(false);
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [optionsProductId, setOptionsProductId] = useState('');
  const [optionGroup, setOptionGroup] = useState<OptionGroup>(blankOptionGroup);
  const [productOption, setProductOption] = useState<ProductOption>(blankProductOption);
  const [savingOptionGroup, setSavingOptionGroup] = useState(false);
  const [savingProductOption, setSavingProductOption] = useState(false);
  const productEditorRef = useRef<HTMLElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const promotionImageInputRef = useRef<HTMLInputElement | null>(null);

  const load = async () => {
    const result = await getCatalog();
    setProducts(result.products);
    setCategories(result.categories);
  };

  const loadVisitStats = async () => {
    setLoadingStats(true);
    try {
      const analyticsRef = collection(db, 'analytics');
      const [totalSnap, areaSnaps, pageSnaps, ctaSnaps, productViewSnaps, addToCartSnaps, beginOrderSnap] = await Promise.all([
        getCountFromServer(query(analyticsRef, where('type', '==', 'page_view'))),
        Promise.all(Object.keys(AREA_LABELS).map((key) => getCountFromServer(query(analyticsRef, where('key', '==', `area:${key}`))))),
        Promise.all(Object.keys(PAGE_LABELS).map((key) => getCountFromServer(query(analyticsRef, where('key', '==', `page:${key}`))))),
        Promise.all(Object.keys(CTA_LABELS).map((key) => getCountFromServer(query(analyticsRef, where('key', '==', `cta:${key}`))))),
        Promise.all(Object.keys(PRODUCT_ID_LABELS).map((key) => getCountFromServer(query(analyticsRef, where('type', '==', 'view_product'), where('key', '==', `product:${key}`))))),
        Promise.all(Object.keys(PRODUCT_ID_LABELS).map((key) => getCountFromServer(query(analyticsRef, where('type', '==', 'add_to_cart'), where('key', '==', `product:${key}`))))),
        getCountFromServer(query(analyticsRef, where('type', '==', 'begin_order'))),
      ]);
      const areas = Object.keys(AREA_LABELS)
        .map((key, i) => ({ key, label: AREA_LABELS[key], count: areaSnaps[i].data().count }))
        .sort((a, b) => b.count - a.count);
      const pages = Object.keys(PAGE_LABELS)
        .map((key, i) => ({ key, label: PAGE_LABELS[key], count: pageSnaps[i].data().count }))
        .sort((a, b) => b.count - a.count);
      const ctas = Object.keys(CTA_LABELS)
        .map((key, i) => ({ key, label: CTA_LABELS[key], count: ctaSnaps[i].data().count }))
        .sort((a, b) => b.count - a.count);
      const productViews = Object.keys(PRODUCT_ID_LABELS)
        .map((key, i) => ({ key, label: PRODUCT_ID_LABELS[key], count: productViewSnaps[i].data().count }))
        .filter((item) => item.count > 0)
        .sort((a, b) => b.count - a.count);
      const addToCarts = Object.keys(PRODUCT_ID_LABELS)
        .map((key, i) => ({ key, label: PRODUCT_ID_LABELS[key], count: addToCartSnaps[i].data().count }))
        .filter((item) => item.count > 0)
        .sort((a, b) => b.count - a.count);
      setVisitStats({ totalViews: totalSnap.data().count, areas, pages, ctas, productViews, addToCarts, beginOrders: beginOrderSnap.data().count });
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadCustomers = async () => {
    const snap = await getDocs(collection(db, 'users'));
    setCustomers(snap.docs.map((item) => ({ uid: item.id, ...item.data() } as CustomerAccount)));
  };

  const toggleCustomerEnabled = async (uid: string, enabled: boolean) => {
    await updateDoc(doc(db, 'users', uid), { enabled });
    await loadCustomers();
  };

  const updateCustomerTag = async (uid: string, tag: string) => {
    await updateDoc(doc(db, 'users', uid), { tag });
    await loadCustomers();
  };

  const loadPromotions = async () => {
    setPromotions(await getPromotions());
  };

  const loadSiteSettings = async () => {
    setImagesDownloadable((await getSiteSettings()).imagesDownloadable);
  };

  const toggleImagesDownloadable = async (value: boolean) => {
    setSavingSiteSettings(true);
    try {
      await updateSiteSettings({ imagesDownloadable: value });
      setImagesDownloadable(value);
    } finally {
      setSavingSiteSettings(false);
    }
  };

  const loadOptionGroups = async () => setOptionGroups(await getOptionGroups());
  const loadProductOptions = async () => setProductOptions(await getProductOptions());

  const saveOptionGroupForm = async () => {
    if (!optionGroup.id || !optionsProductId) return setMessage('Elige un producto y escribe un ID para el grupo.');
    setSavingOptionGroup(true);
    try {
      await saveOptionGroup({ ...optionGroup, productId: optionsProductId });
      await loadOptionGroups();
      setOptionGroup({ ...blankOptionGroup, productId: optionsProductId });
      setMessage('Grupo de opciones guardado.');
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : 'No se pudo guardar el grupo.');
    } finally {
      setSavingOptionGroup(false);
    }
  };

  const removeOptionGroupAndReload = async (id: string) => {
    await removeOptionGroup(id);
    await loadOptionGroups();
  };

  const saveProductOptionForm = async () => {
    if (!productOption.id || !productOption.groupId) return setMessage('Elige un grupo y escribe un ID para la opción.');
    setSavingProductOption(true);
    try {
      await saveProductOption({ ...productOption, productId: optionsProductId });
      await loadProductOptions();
      setProductOption({ ...blankProductOption, productId: optionsProductId, groupId: productOption.groupId });
      setMessage('Opción guardada.');
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : 'No se pudo guardar la opción.');
    } finally {
      setSavingProductOption(false);
    }
  };

  const removeProductOptionAndReload = async (id: string) => {
    await removeProductOption(id);
    await loadProductOptions();
  };

  const toggleOptionActive = async (item: ProductOption, active: boolean) => {
    await saveProductOption({ ...item, active });
    await loadProductOptions();
  };

  const toggleOptionAvailable = async (item: ProductOption, available: boolean) => {
    await saveProductOption({ ...item, available });
    await loadProductOptions();
  };

  const loadContactMessages = async () => {
    const snap = await getDocs(query(collection(db, 'contacts'), orderBy('createdAt', 'desc'), limit(50)));
    setContactMessages(snap.docs.map((item) => ({ id: item.id, ...item.data() } as ContactMessage)));
  };

  const removeContactMessage = async (id: string) => {
    await deleteDoc(doc(db, 'contacts', id));
    await loadContactMessages();
  };

  useEffect(() => {
    if (!adminProfile) return;
    setEditAdminName(adminProfile.name || '');
    setEditAdminWhatsapp(adminProfile.whatsapp || '');
  }, [adminProfile]);

  const saveAdminProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    setAdminProfileMsg(null);
    setSavingAdminProfile(true);
    try {
      const name = editAdminName.trim();
      const whatsapp = editAdminWhatsapp.trim();
      await updateDoc(doc(db, 'admins', user.uid), { name, whatsapp });
      setAdminProfile({ name, whatsapp });
      setAdminProfileMsg({ type: 'ok', text: 'Datos actualizados.' });
    } catch (error) {
      console.error(error);
      setAdminProfileMsg({ type: 'error', text: 'No se pudo guardar. Intenta de nuevo.' });
    } finally {
      setSavingAdminProfile(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) { setLoading(false); return; }
      try {
        const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
        const enabled = adminDoc.exists() && adminDoc.data()?.enabled === true;
        setIsAdmin(enabled);
        if (enabled) {
          setAdminProfile({ name: adminDoc.data()?.name, whatsapp: adminDoc.data()?.whatsapp });
          await Promise.all([load(), loadVisitStats(), loadCustomers(), loadPromotions(), loadContactMessages(), loadSiteSettings(), loadOptionGroups(), loadProductOptions()]);
        }
      } catch (error) {
        console.error(error);
        setIsAdmin(false);
      } finally { setLoading(false); }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Un cliente que llega aquí (p. ej. porque /login siempre manda a /admin
    // primero) no necesita ver un mensaje de "sin permisos" — se le manda
    // directo al panel que sí le corresponde.
    if (!loading && user && !isAdmin) window.location.assign('/mi-cuenta');
  }, [loading, user, isAdmin]);

  useEffect(() => () => {
    if (imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  useEffect(() => () => {
    if (promotionImagePreview.startsWith('blob:')) URL.revokeObjectURL(promotionImagePreview);
  }, [promotionImagePreview]);

  const categoryNames = useMemo(() => categories.map((item) => item.name), [categories]);
  const groupsForProduct = useMemo(() => optionGroups.filter((item) => item.productId === optionsProductId), [optionGroups, optionsProductId]);
  const optionsForGroup = (groupId: string) => productOptions.filter((item) => item.groupId === groupId);

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

  const choosePromotionImage = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setMessage('Selecciona una imagen válida.');
    if (file.size > MAX_IMAGE_SIZE) return setMessage('La imagen no puede superar 15 MB.');
    if (promotionImagePreview.startsWith('blob:')) URL.revokeObjectURL(promotionImagePreview);
    setSelectedPromotionImage(file);
    setPromotionImagePreview(URL.createObjectURL(file));
  };

  const savePromotionForm = async () => {
    if (!promotion.id || !promotion.title) return setMessage('Completa ID y título de la promoción.');
    setSavingPromotion(true);
    setMessage('Guardando promoción…');
    try {
      let promotionToSave: Promotion = { ...promotion, sortOrder: Number(promotion.sortOrder) };
      if (selectedPromotionImage) {
        const uploaded = await uploadPromotionImage(promotion.id, selectedPromotionImage);
        promotionToSave = { ...promotionToSave, image: uploaded.image };
      }
      await savePromotion(promotionToSave);
      await loadPromotions();
      setPromotion(promotionToSave);
      setSelectedPromotionImage(null);
      setPromotionImagePreview(promotionToSave.image || '');
      if (promotionImageInputRef.current) promotionImageInputRef.current.value = '';
      setMessage('Promoción guardada.');
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : 'No se pudo guardar la promoción.');
    } finally { setSavingPromotion(false); }
  };

  const editPromotion = (item: Promotion) => {
    setPromotion(item);
    setSelectedPromotionImage(null);
    setPromotionImagePreview(item.image || '');
    if (promotionImageInputRef.current) promotionImageInputRef.current.value = '';
  };

  const newPromotion = () => {
    setPromotion(blankPromotion);
    setSelectedPromotionImage(null);
    setPromotionImagePreview('');
    if (promotionImageInputRef.current) promotionImageInputRef.current.value = '';
  };

  const saveCategoryForm = async () => {
    if (!category.id || !category.name) return setMessage('Completa ID y nombre de categoría.');
    await saveCategory({ ...category, slug: category.slug || slugifyCatalog(category.name), sortOrder: Number(category.sortOrder) });
    await load(); setCategory(blankCategory); setMessage('Categoría guardada.');
  };

  if (loading) return <main className="container" style={{ padding: '80px 0' }}><h1>Panel de administración</h1><p>Cargando permisos…</p></main>;
  if (!user) return <main className="container" style={{ padding: '80px 0' }}><h1>Panel de administración</h1><p>Inicia sesión para continuar.</p><a className="btn primary" href="/login">Entrar</a></main>;
  if (!isAdmin) return <main className="container" style={{ padding: '80px 0' }}><h1>Panel de administración</h1><p>Redirigiendo…</p></main>;

  const customerTags = Array.from(new Set(customers.map((item) => item.tag).filter((tag): tag is string => !!tag))).sort();
  const visibleCustomers = customerTagFilter === 'Todos' ? customers : customers.filter((item) => item.tag === customerTagFilter);

  return <main className="container" style={{ padding: '50px 0 90px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
      <div><span className="eyebrow">Admin • Firestore + Cloudflare R2</span><h1>Catálogo Club BASA</h1><p>Productos, categorías, precios, imágenes y videos se administran desde aquí.</p></div>
      <button type="button" className="btn secondary" onClick={() => signOut(auth)}>Cerrar sesión</button>
    </div>
    {message && <div className="card" style={{ margin: '18px 0' }}>{message}</div>}

    <section style={{ padding: '25px 0' }}>
      <div className="sectionHead" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div><h2>Mis datos</h2><p>Nombre y WhatsApp de contacto de tu cuenta de administrador.</p></div>
        <button type="button" className="btn secondary" aria-expanded={adminProfileOpen} onClick={() => setAdminProfileOpen((open) => !open)}>{adminProfileOpen ? 'Ocultar' : 'Editar datos'}</button>
      </div>
      {adminProfileOpen && <form className="form" style={{ maxWidth: 420 }} onSubmit={saveAdminProfile}>
        <div className="field">
          <label htmlFor="admin-profile-name">Nombre</label>
          <input id="admin-profile-name" type="text" value={editAdminName} onChange={(e) => setEditAdminName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="admin-profile-whatsapp">WhatsApp</label>
          <input id="admin-profile-whatsapp" type="tel" value={editAdminWhatsapp} onChange={(e) => setEditAdminWhatsapp(e.target.value)} placeholder="744 123 4567" />
        </div>
        <button className="btn primary" type="submit" disabled={savingAdminProfile}>{savingAdminProfile ? 'Guardando…' : 'Guardar cambios'}</button>
        {adminProfileMsg && <p className={adminProfileMsg.type === 'error' ? 'error' : 'small'} role={adminProfileMsg.type === 'error' ? 'alert' : undefined} style={{ marginTop: 10 }}>{adminProfileMsg.text}</p>}
      </form>}
    </section>

    <section style={{ padding: '25px 0' }}><div className="card">
      <h2>Protección de imágenes</h2>
      <p style={{ color: '#6b7280', margin: '4px 0 14px' }}>
        Cuando está desactivado, el sitio bloquea el clic derecho y el guardado táctil sobre las imágenes del catálogo
        para dificultar que se descarguen. No es un bloqueo perfecto — cualquiera puede seguir tomando una captura de
        pantalla — pero evita el guardado directo desde el navegador.
      </p>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={imagesDownloadable}
          disabled={savingSiteSettings}
          onChange={(e) => toggleImagesDownloadable(e.target.checked)}
        /> Permitir que los visitantes descarguen las imágenes del sitio
      </label>
    </div></section>

    <section style={{ padding: '25px 0' }}><div className="card">
      <h2>Visitas del sitio</h2>
      <p style={{ color: '#6b7280', margin: '4px 0 14px' }}>Conteo interno de visitas por página y sección. No incluye direcciones IP ni datos de inicio de sesión.</p>
      {loadingStats ? <p>Cargando estadísticas…</p> : visitStats ? <>
        <p><strong>{visitStats.totalViews}</strong> visitas totales · <strong>{visitStats.beginOrders}</strong> pedidos iniciados desde el carrito.</p>
        <div className="grid3" style={{ marginTop: 14 }}>
          <div><h3 style={{ fontSize: 16 }}>Áreas más visitadas</h3><ul style={{ margin: 0, paddingLeft: 18 }}>{visitStats.areas.map((a) => <li key={a.key}>{a.label}: {a.count}</li>)}</ul></div>
          <div><h3 style={{ fontSize: 16 }}>Páginas más visitadas</h3><ul style={{ margin: 0, paddingLeft: 18 }}>{visitStats.pages.map((p) => <li key={p.key}>{p.label}: {p.count}</li>)}</ul></div>
          <div><h3 style={{ fontSize: 16 }}>CTA que más convierten</h3><ul style={{ margin: 0, paddingLeft: 18 }}>{visitStats.ctas.map((c) => <li key={c.key}>{c.label}: {c.count}</li>)}</ul></div>
        </div>
        <div className="grid3" style={{ marginTop: 14 }}>
          <div><h3 style={{ fontSize: 16 }}>Productos más vistos</h3><ul style={{ margin: 0, paddingLeft: 18 }}>{visitStats.productViews.length ? visitStats.productViews.map((p) => <li key={p.key}>{p.label}: {p.count}</li>) : <li>Sin datos todavía.</li>}</ul></div>
          <div><h3 style={{ fontSize: 16 }}>Más agregados al carrito</h3><ul style={{ margin: 0, paddingLeft: 18 }}>{visitStats.addToCarts.length ? visitStats.addToCarts.map((p) => <li key={p.key}>{p.label}: {p.count}</li>) : <li>Sin datos todavía.</li>}</ul></div>
        </div>
      </> : <p>Sin datos todavía.</p>}
    </div></section>

    <section style={{ padding: '25px 0' }}><div className="sectionHead"><h2>Usuarios</h2><p>{customers.length} cuentas registradas. Aprueba o revoca el acceso a contenido exclusivo, etiquétalas para organizarlas y contáctalas directo.</p></div>
      {customerTags.length > 0 && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <button type="button" className="btn" style={customerTagFilter === 'Todos' ? { background: 'var(--brand)', color: '#fff' } : { background: '#fff', border: '1px solid var(--line)' }} onClick={() => setCustomerTagFilter('Todos')}>Todos ({customers.length})</button>
        {customerTags.map((tag) => <button type="button" key={tag} className="btn" style={customerTagFilter === tag ? { background: 'var(--brand)', color: '#fff' } : { background: '#fff', border: '1px solid var(--line)' }} onClick={() => setCustomerTagFilter(tag)}>{tag} ({customers.filter((item) => item.tag === tag).length})</button>)}
      </div>}
      <div className="grid3">{visibleCustomers.map((item) => <div className="card" key={item.uid}>
      <strong>{item.name || 'Sin nombre'}</strong>
      <p>{item.email}</p>
      {item.whatsapp && <p>{item.whatsapp}</p>}
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, cursor: 'pointer' }}>
        <input type="checkbox" checked={item.enabled === true} onChange={(e) => toggleCustomerEnabled(item.uid, e.target.checked)} /> Cuenta aprobada
      </label>
      <div className="field" style={{ marginTop: 10, marginBottom: 0 }}>
        <label htmlFor={`tag-${item.uid}`}>Etiqueta</label>
        <input id={`tag-${item.uid}`} type="text" defaultValue={item.tag || ''} placeholder="Ej. VIP, Mayorista, Frecuente" onBlur={(e) => { const value = e.target.value.trim(); if (value !== (item.tag || '')) updateCustomerTag(item.uid, value); }} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        {item.whatsapp && <a className="btn secondary" style={{ flex: 1, fontSize: 13, padding: '9px 10px' }} href={waLinkTo(item.whatsapp, `Hola ${item.name || ''}, te escribimos desde Club BASA.`)} target="_blank" rel="noreferrer">WhatsApp</a>}
        {item.email && <a className="btn secondary" style={{ flex: 1, fontSize: 13, padding: '9px 10px' }} href={`mailto:${item.email}`}>Correo</a>}
      </div>
    </div>)}{visibleCustomers.length === 0 && <p>{customers.length === 0 ? 'Todavía no hay cuentas registradas.' : 'Ningún usuario tiene esta etiqueta.'}</p>}</div></section>

    <section style={{ padding: '25px 0' }}><div className="sectionHead"><h2>Mensajes de contacto</h2><p>{contactMessages.length} mensajes recientes del formulario de contacto.</p></div><div className="grid3">{contactMessages.map((item) => <div className="card" key={item.id}>
      <strong>{item.name || 'Sin nombre'}</strong>
      <p>{item.contact}</p>
      {item.message && <p>{item.message}</p>}
      {item.createdAt && <small>{item.createdAt.toDate().toLocaleString('es-MX')}</small>}
      <div style={{ marginTop: 10 }}><button type="button" className="btn secondary" onClick={() => removeContactMessage(item.id)}>Eliminar</button></div>
    </div>)}{contactMessages.length === 0 && <p>Todavía no hay mensajes de contacto.</p>}</div></section>

    <section style={{ padding: '25px 0' }}><div className="sectionHead"><h2>Promociones</h2><p>{promotions.length} elementos. Solo los marcados como activos son visibles en /mi-cuenta para cuentas aprobadas.</p></div><div className="grid3">{promotions.map((item) => <div className="card" key={item.id}>
      <strong>{item.title}</strong><p>{PROMOTION_TYPE_LABELS[item.type]}</p>
      {item.image && <img src={item.image} alt={item.title} style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 12, marginTop: 8 }} />}
      <small>{item.active ? 'Activo' : 'Inactivo'}</small>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}><button type="button" className="btn secondary" onClick={() => editPromotion(item)}>Editar</button><button type="button" className="btn secondary" onClick={async () => { await removePromotion(item.id); await loadPromotions(); }}>Eliminar</button></div>
    </div>)}</div>

    <div className="card" style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}><h3>{promotion.id ? 'Editar promoción' : 'Nueva promoción'}</h3>{promotion.id && <button type="button" className="btn secondary" onClick={newPromotion}>Nueva promoción</button>}</div>
      <div className="grid3">
        <div className="field"><label>ID único</label><input value={promotion.id} onChange={(e) => setPromotion({ ...promotion, id: e.target.value.trim().toLowerCase().replace(/\s+/g, '-') })} placeholder="promo-agosto" /></div>
        <div className="field"><label>Título</label><input value={promotion.title} onChange={(e) => setPromotion({ ...promotion, title: e.target.value })} /></div>
        <div className="field"><label>Tipo</label><select value={promotion.type} onChange={(e) => setPromotion({ ...promotion, type: e.target.value as PromotionType })}>{Object.entries(PROMOTION_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div className="field"><label>Orden</label><input type="number" value={promotion.sortOrder} onChange={(e) => setPromotion({ ...promotion, sortOrder: Number(e.target.value) })}/></div>
      </div>
      <div className="field"><label>Descripción</label><textarea value={promotion.description} onChange={(e) => setPromotion({ ...promotion, description: e.target.value })} rows={3}/></div>

      <div className="field" style={{ marginTop: 18 }}><label>Imagen</label><div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        {promotionImagePreview && <img src={promotionImagePreview} alt="Vista previa" style={{ width: 220, maxWidth: '100%', aspectRatio: '16 / 9', objectFit: 'contain', background: '#fff8ef', borderRadius: 12, border: '1px solid #ddd' }} />}
        <div><input ref={promotionImageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif" onChange={(e) => choosePromotionImage(e.target.files?.[0])} style={{ display: 'none' }} /><button type="button" className="btn secondary" onClick={() => promotionImageInputRef.current?.click()}>Cargar imagen</button>{selectedPromotionImage && <small> Seleccionada: {selectedPromotionImage.name}</small>}</div>
      </div></div>

      {promotion.type === 'video' && <div className="field" style={{ marginTop: 18 }}><label>Video (URL externa)</label><div className="grid3">
        <div className="field"><label>Fuente</label><select value={promotion.videoProvider || ''} onChange={(e) => setPromotion({ ...promotion, videoProvider: (e.target.value || undefined) as Promotion['videoProvider'] })}><option value="">Selecciona</option>{productVideoProviders.map((provider) => <option key={provider.value} value={provider.value}>{provider.label}</option>)}</select></div>
        <div className="field" style={{ gridColumn: 'span 2' }}><label>URL del video</label><input value={promotion.videoUrl || ''} onChange={(e) => setPromotion({ ...promotion, videoUrl: e.target.value })} placeholder="https://..." /></div>
      </div></div>}

      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 18, cursor: 'pointer' }}><input type="checkbox" checked={promotion.active} onChange={(e) => setPromotion({ ...promotion, active: e.target.checked })} /> Activa (visible en /mi-cuenta)</label>
      <div style={{ marginTop: 18 }}><button type="button" className="btn primary" onClick={savePromotionForm} disabled={savingPromotion}>{savingPromotion ? 'Guardando…' : 'Guardar promoción'}</button></div>
    </div>
    </section>

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
      <div className="field"><label>SKU</label><input value={product.sku || ''} onChange={(e) => setProduct({ ...product, sku: e.target.value.trim().toUpperCase() })} placeholder="BASA-MAL-001" /></div>
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
    <section style={{ padding: '25px 0' }}>
      <div className="sectionHead"><h2>Ingredientes y opciones</h2><p>Configura sabores/toppings de un producto y marca disponibilidad sin necesitar un despliegue.</p></div>
      <div className="field" style={{ maxWidth: 320 }}>
        <label>Producto</label>
        <select value={optionsProductId} onChange={(e) => { setOptionsProductId(e.target.value); setOptionGroup({ ...blankOptionGroup, productId: e.target.value }); setProductOption({ ...blankProductOption, productId: e.target.value, groupId: '' }); }}>
          <option value="">Selecciona un producto</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {optionsProductId && <>
        <div className="grid3" style={{ marginTop: 18 }}>
          {groupsForProduct.map((group) => (
            <div className="card" key={group.id}>
              <strong>{group.label}</strong>
              <p>{SELECTION_MODE_LABELS[group.selectionMode]} · {group.minSelections}-{group.maxSelections} · {group.required ? 'Obligatorio' : 'Opcional'}{group.allowDuplicates ? ' · Permite repetir opción' : ''}</p>
              <small>{group.active ? 'Activo' : 'Oculto'}</small>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button type="button" className="btn secondary" onClick={() => setOptionGroup(group)}>Editar</button>
                <button type="button" className="btn secondary" onClick={() => removeOptionGroupAndReload(group.id)}>Eliminar</button>
              </div>

              <div style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                <strong style={{ fontSize: 14 }}>Opciones</strong>
                {optionsForGroup(group.id).map((option) => (
                  <div key={option.id} style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--line)' }}>
                    <p style={{ margin: 0 }}>{option.label}{option.priceDelta ? ` (+$${option.priceDelta})` : ''}</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                      <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, cursor: 'pointer' }}><input type="checkbox" checked={option.active} onChange={(e) => toggleOptionActive(option, e.target.checked)} /> Activa</label>
                      <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, cursor: 'pointer' }}><input type="checkbox" checked={option.available} onChange={(e) => toggleOptionAvailable(option, e.target.checked)} /> Disponible</label>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <button type="button" className="cartLineLink" onClick={() => setProductOption(option)}>Editar</button>
                      <button type="button" className="cartLineLink cartLineRemove" onClick={() => removeProductOptionAndReload(option.id)}>Eliminar</button>
                    </div>
                  </div>
                ))}
                {optionsForGroup(group.id).length === 0 && <p className="small" style={{ marginTop: 8 }}>Sin opciones todavía.</p>}
                <button type="button" className="btn secondary" style={{ marginTop: 10, fontSize: 13, padding: '8px 12px' }} onClick={() => setProductOption({ ...blankProductOption, productId: optionsProductId, groupId: group.id })}>+ Agregar opción a este grupo</button>
              </div>
            </div>
          ))}
        </div>
        {groupsForProduct.length === 0 && <p style={{ marginTop: 14 }}>Este producto todavía no tiene grupos de opciones.</p>}

        <div className="card" style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}><h3>{optionGroup.id ? 'Editar grupo' : 'Nuevo grupo'}</h3>{optionGroup.id && <button type="button" className="btn secondary" onClick={() => setOptionGroup({ ...blankOptionGroup, productId: optionsProductId })}>Nuevo grupo</button>}</div>
          <div className="grid3">
            <div className="field"><label>ID único</label><input value={optionGroup.id} onChange={(e) => setOptionGroup({ ...optionGroup, id: e.target.value.trim().toLowerCase().replace(/\s+/g, '-') })} placeholder="malteada-sabores" /></div>
            <div className="field"><label>Etiqueta</label><input value={optionGroup.label} onChange={(e) => setOptionGroup({ ...optionGroup, label: e.target.value })} placeholder="Elige tus sabores" /></div>
            <div className="field"><label>Modo</label><select value={optionGroup.selectionMode} onChange={(e) => setOptionGroup({ ...optionGroup, selectionMode: e.target.value as SelectionMode })}>{Object.entries(SELECTION_MODE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
            <div className="field"><label>Mínimo</label><input type="number" min="0" value={optionGroup.minSelections} onChange={(e) => setOptionGroup({ ...optionGroup, minSelections: Number(e.target.value) })} /></div>
            <div className="field"><label>Máximo</label><input type="number" min="1" value={optionGroup.maxSelections} onChange={(e) => setOptionGroup({ ...optionGroup, maxSelections: Number(e.target.value) })} /></div>
            <div className="field"><label>Orden</label><input type="number" value={optionGroup.sortOrder} onChange={(e) => setOptionGroup({ ...optionGroup, sortOrder: Number(e.target.value) })} /></div>
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, cursor: 'pointer' }}><input type="checkbox" checked={optionGroup.required} onChange={(e) => setOptionGroup({ ...optionGroup, required: e.target.checked })} /> Obligatorio</label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, cursor: 'pointer' }}><input type="checkbox" checked={optionGroup.allowDuplicates} onChange={(e) => setOptionGroup({ ...optionGroup, allowDuplicates: e.target.checked })} /> Permitir elegir la misma opción varias veces</label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, cursor: 'pointer' }}><input type="checkbox" checked={optionGroup.active} onChange={(e) => setOptionGroup({ ...optionGroup, active: e.target.checked })} /> Activo (visible para el cliente)</label>
          <div style={{ marginTop: 14 }}><button type="button" className="btn primary" onClick={saveOptionGroupForm} disabled={savingOptionGroup}>{savingOptionGroup ? 'Guardando…' : 'Guardar grupo'}</button></div>
        </div>

        <div className="card" style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}><h3>{productOption.id ? 'Editar opción' : 'Nueva opción'}</h3>{productOption.id && <button type="button" className="btn secondary" onClick={() => setProductOption({ ...blankProductOption, productId: optionsProductId, groupId: productOption.groupId })}>Nueva opción</button>}</div>
          <div className="grid3">
            <div className="field"><label>Grupo</label><select value={productOption.groupId} onChange={(e) => setProductOption({ ...productOption, groupId: e.target.value })}><option value="">Selecciona un grupo</option>{groupsForProduct.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}</select></div>
            <div className="field"><label>ID único</label><input value={productOption.id} onChange={(e) => setProductOption({ ...productOption, id: e.target.value.trim().toLowerCase().replace(/\s+/g, '-') })} placeholder="fresa" /></div>
            <div className="field"><label>Etiqueta</label><input value={productOption.label} onChange={(e) => setProductOption({ ...productOption, label: e.target.value })} placeholder="Fresa" /></div>
            <div className="field"><label>Costo adicional</label><input type="number" min="0" value={productOption.priceDelta} onChange={(e) => setProductOption({ ...productOption, priceDelta: Number(e.target.value) })} /></div>
            <div className="field"><label>Orden</label><input type="number" value={productOption.sortOrder} onChange={(e) => setProductOption({ ...productOption, sortOrder: Number(e.target.value) })} /></div>
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, cursor: 'pointer' }}><input type="checkbox" checked={productOption.active} onChange={(e) => setProductOption({ ...productOption, active: e.target.checked })} /> Activa (visible)</label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, cursor: 'pointer' }}><input type="checkbox" checked={productOption.available} onChange={(e) => setProductOption({ ...productOption, available: e.target.checked })} /> Disponible (no agotada)</label>
          <div style={{ marginTop: 14 }}><button type="button" className="btn primary" onClick={saveProductOptionForm} disabled={savingProductOption}>{savingProductOption ? 'Guardando…' : 'Guardar opción'}</button></div>
        </div>
      </>}
    </section>

    <p><a href="/">← Volver al catálogo</a></p>
  </main>;
}
