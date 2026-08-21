'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getCatalog, getFallbackCategories, getFallbackProducts, type CatalogProduct } from '@/lib/catalog';
import { getProductVideoEmbed } from '@/lib/video';
import { buildOrder, waLink } from '@/lib/whatsapp';
import { track } from '@/lib/analytics';
import Reveal from '@/components/Reveal';
import ScrollScene from '@/components/ScrollScene';
import ContactForm from '@/components/ContactForm';

const heroImage = 'https://res.cloudinary.com/m71breje/image/upload/v1786171381/panquecitos_sin_logo_i59l6l.jpg';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://menu.club-basa.com';
// "Gancho" is an internal merchandising category (attraction/loss-leader products).
// Its products stay visible under "Todos" — only the category label is hidden from customers.
const INTERNAL_ONLY_CATEGORIES = new Set(['gancho']);
const isInternalCategory = (name: string) => INTERNAL_ONLY_CATEGORIES.has(name.toLowerCase());

export default function Home() {
  const [products, setProducts] = useState<CatalogProduct[]>(getFallbackProducts());
  const [categories, setCategories] = useState(getFallbackCategories());
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [catalogStatus, setCatalogStatus] = useState<'loading' | 'firestore' | 'fallback'>('loading');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartHydrated, setCartHydrated] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const closedViaBackRef = useRef(false);
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePan, setImagePan] = useState({ x: 0, y: 0 });
  const [isPanningImage, setIsPanningImage] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const productImageRef = useRef<HTMLDivElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const categoryTabsRef = useRef<HTMLDivElement>(null);
  const [showTabsFade, setShowTabsFade] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('clubbasa-cart');
      if (saved) setCart(JSON.parse(saved));
    } catch { /* localStorage unavailable (private browsing) or corrupt data */ }
    setCartHydrated(true);
  }, []);

  useEffect(() => {
    if (!cartHydrated) return;
    try {
      localStorage.setItem('clubbasa-cart', JSON.stringify(cart));
    } catch { /* localStorage unavailable (private browsing, storage full) */ }
  }, [cart, cartHydrated]);

  useEffect(() => {
    let mounted = true;
    // getCatalog() can hang indefinitely (rather than reject) if Firestore is
    // unreachable, so race it against a timeout to guarantee we still fall back.
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Firestore catalog request timed out.')), 8000);
    });
    Promise.race([getCatalog(), timeout])
      .then(({ products: remoteProducts, categories: remoteCategories }) => {
        if (!mounted) return;
        if (remoteProducts.length) {
          setProducts(remoteProducts);
          setCategories(remoteCategories.length ? remoteCategories : getFallbackCategories());
          setCatalogStatus('firestore');
        } else setCatalogStatus('fallback');
      })
      .catch((error) => {
        console.warn('Firestore catalog unavailable, using local fallback.', error);
        if (mounted) setCatalogStatus('fallback');
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const el = categoryTabsRef.current;
    if (!el) return;
    const updateFade = () => setShowTabsFade(el.scrollWidth - el.clientWidth - el.scrollLeft > 8);
    updateFade();
    el.addEventListener('scroll', updateFade, { passive: true });
    window.addEventListener('resize', updateFade);
    return () => {
      el.removeEventListener('scroll', updateFade);
      window.removeEventListener('resize', updateFade);
    };
  }, [categories]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  useEffect(() => {
    setImageZoom(1);
    setImagePan({ x: 0, y: 0 });
  }, [selectedProduct]);

  useEffect(() => {
    const el = productImageRef.current;
    if (!el) return;
    // React attaches onWheel as a passive listener by default, which silently
    // ignores preventDefault() — attach natively so zooming doesn't also scroll the page.
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      setImageZoom((zoom) => {
        const next = Math.min(4, Math.max(1, zoom - event.deltaY * 0.0015));
        setImagePan((pan) => (next === 1 ? { x: 0, y: 0 } : clampPan(pan, next)));
        return next;
      });
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [selectedProduct]);

  useEffect(() => {
    if (!selectedProduct) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedProduct(null);
    };
    // Push a history entry so the phone's back button closes the modal
    // instead of navigating away from the site entirely.
    const onPopState = () => {
      closedViaBackRef.current = true;
      setSelectedProduct(null);
    };
    window.history.pushState({ productModal: true }, '');
    window.addEventListener('popstate', onPopState);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('popstate', onPopState);
      if (!closedViaBackRef.current) window.history.back();
      closedViaBackRef.current = false;
    };
  }, [selectedProduct]);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('main > section[id]'));
    if (!sections.length) return;
    const seen = new Set<string>();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || seen.has(entry.target.id)) return;
        seen.add(entry.target.id);
        track('section_view', { area: entry.target.id });
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.3 });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const visibleProducts = useMemo(() => products
    .filter((p) => p.id !== 'coffee')
    .filter((p) => activeCategory === 'Todos' || p.category === activeCategory), [products, activeCategory]);
  const items = useMemo(() => Object.entries(cart).map(([id, qty]) => ({ id, qty })).filter((x) => x.qty > 0), [cart]);
  const total = items.reduce((sum, item) => sum + (products.find((p) => p.id === item.id)?.price || 0) * item.qty, 0);
  const add = (id: string, delta: number) => setCart((current) => ({ ...current, [id]: Math.max(0, (current[id] || 0) + delta) }));
  const openProduct = (product: CatalogProduct) => {
    setSelectedProduct(product);
    track('view_product', { product: product.name });
  };
  const clampPan = (pan: { x: number; y: number }, zoom: number) => {
    const max = (zoom - 1) * 160;
    return { x: Math.min(max, Math.max(-max, pan.x)), y: Math.min(max, Math.max(-max, pan.y)) };
  };
  const onImageMouseDown = (event: React.MouseEvent) => {
    if (imageZoom <= 1) return;
    event.preventDefault();
    setIsPanningImage(true);
    panStartRef.current = { x: event.clientX, y: event.clientY, panX: imagePan.x, panY: imagePan.y };
  };
  const onImageMouseMove = (event: React.MouseEvent) => {
    if (!isPanningImage) return;
    const start = panStartRef.current;
    setImagePan(clampPan({ x: start.panX + (event.clientX - start.x), y: start.panY + (event.clientY - start.y) }, imageZoom));
  };
  const stopPanningImage = () => setIsPanningImage(false);
  const resetImageZoom = () => { setImageZoom(1); setImagePan({ x: 0, y: 0 }); };
  const share = async () => {
    const data = { title: 'Club BASA Acapulco', text: 'Mira el menú de Club BASA 👇', url: window.location.href };
    if (navigator.share) await navigator.share(data); else await navigator.clipboard.writeText(window.location.href);
    track('share_landing');
  };
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(`Mira el menú de Club BASA Acapulco: ${siteUrl}`)}`;
  const selectedVideo = selectedProduct ? getProductVideoEmbed(selectedProduct.videoProvider, selectedProduct.videoUrl) : null;

  const handleLogoDoubleClick = () => {
    track('logo_admin_login');
    window.location.href = '/login';
  };

  // Featured products for the cinematic scenes below — pulled from the same
  // live catalog data as the grid, never hardcoded. Gracefully absent in the
  // fallback catalog (some don't exist there), every usage below is optional.
  const sixProduct = products.find((p) => p.id === 'six');
  const shakeProduct = products.find((p) => p.id === 'shake');
  const specialProduct = products.find((p) => p.id === 'special');
  const waffleProduct = products.find((p) => p.id === 'waffle');
  const crepaProduct = products.find((p) => p.id === 'crepa');
  const menuPosterProduct = products.find((p) => p.id === 'menu');

  return <>
    <header className="nav"><div className="container navin">
      <a
        className="logo"
        href="#inicio"
        aria-label="Club BASA. Un clic vuelve al inicio. Doble clic abre el acceso administrativo."
        title="Clic: inicio · Doble clic/tap: acceso administrativo"
        onDoubleClick={handleLogoDoubleClick}
      ><span className="logoBlack">CLUB</span><span>BASA</span><small>ACAPULCO</small></a>
      <nav className="navlinks"><a href="#menu">Menú</a><a href="#beneficios">Beneficios</a><a href="#envios">Envíos</a><a href="#faq">FAQ</a><a href="/blog">Blog</a><a href="#contacto">Contacto</a><a href="/mi-cuenta">Mi cuenta</a></nav>
      <a className="navcta" href={waLink('Hola Club BASA, quiero hacer un pedido.')} onClick={() => track('cta_whatsapp_header')}>◔ &nbsp;Pedir por WhatsApp</a>
      <button type="button" className="navToggle" aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={mobileMenuOpen} aria-controls="mobile-menu" onClick={() => setMobileMenuOpen((open) => !open)}>{mobileMenuOpen ? '✕' : '☰'}</button>
    </div>
    {mobileMenuOpen && <nav id="mobile-menu" className="mobileMenu" aria-label="Menú móvil" onClick={() => setMobileMenuOpen(false)}>
      <a href="#menu">Menú</a><a href="#beneficios">Beneficios</a><a href="#envios">Envíos</a><a href="#faq">FAQ</a><a href="/blog">Blog</a><a href="#contacto">Contacto</a><a href="/mi-cuenta">Mi cuenta</a>
    </nav>}
    </header>

    <main id="inicio">
      {/* Escena 1 — Hero: se mantiene la implementación full-bleed original (ya tenía min-height:100vh y fade-in propio), solo se agrega scroll-snap y se reordenan los CTA por prioridad de conversión. */}
      <section id="hero" className="hero heroFull"><Image className="heroImage" src={heroImage} alt="Six de panquecitos Club BASA Acapulco" fill priority sizes="100vw" quality={82}/><div className="heroShade" aria-hidden="true"/><div className="container heroContent"><div className="heroCopy reveal">
        <span className="eyebrow heroEyebrow">Producto estrella • Panquecitos Club BASA</span><h1>Sabor que<br/>enamora.<br/>Nutrición que<br/><em>transforma.</em></h1>
        <p>Panquecitos altos en proteína, sin harinas ni aceite, hechos con avena y nutrición Herbalife. El snack perfecto para disfrutar.</p>
        <div className="actions"><a className="btn primary" href={waLink('Hola Club BASA, quiero hacer un pedido.')} onClick={() => track('cta_whatsapp_hero')}>◔ &nbsp;Pedir ahora</a><a className="btn secondary heroSecondary" href="#menu" onClick={() => track('cta_menu')}>Ver menú</a></div>
        <div className="heroTrust"><span>◯ <b>Sin harinas</b><small>ni aceite</small></span><span>◉ <b>Altos en</b><small>proteína</small></span><span>♡ <b>Hechos con</b><small>nutrición Herbalife</small></span></div>
      </div></div>
      <div className="heroOffer container"><div className="offerItem"><div className="offerIcon">☕</div><div><strong>Primera compra de six</strong><p>Incluye recipiente + papel grado alimenticio<br/>y café de grano arábica de regalo.</p></div></div><div className="offerItem offerPrice"><div className="offerIcon">▣</div><div><strong>Six de panquecitos</strong><b>$150</b></div></div><div className="offerItem"><div className="offerIcon">🛵</div><div><strong>Envío a domicilio</strong><p>Zona cercana $60 • Zona ampliada $80<br/>Fuera de zona: cotización personalizada.</p></div></div></div></section>

      {/* Escena 2 — Producto estrella: Producto → Beneficio → Oferta → CTA */}
      <ScrollScene id="producto-estrella">
        <div className="container">
          <div className="sceneGrid">
            <div className="sceneMedia" style={{ aspectRatio: '4 / 5' }}>
              {sixProduct?.image ? <Image src={sixProduct.image} alt="Six de panquecitos Club BASA" fill sizes="(max-width: 850px) 100vw, 50vw" /> : <div className="menuImageEmpty" style={{ position: 'absolute', inset: 0 }}>Sin imagen</div>}
            </div>
            <div>
              <span className="sceneEyebrow">Producto estrella</span>
              <h2>Six de panquecitos</h2>
              <p>{sixProduct?.description || '6 panquecitos en recipiente con papel grado alimenticio.'}</p>
              <div className="scenePrice">{sixProduct?.price ? `$${sixProduct.price}` : 'Consultar'}</div>
              <div id="beneficios" className="grid3" style={{ margin: '10px 0 28px' }}>
                <div className="card"><div className="icon">🧁</div><h3>Six completo</h3><p>$150 con recipiente y papel grado alimenticio.</p></div>
                <div className="card"><div className="icon">☕</div><h3>Regalo de primera compra</h3><p>En tu primer six recibes un café de grano arábica.</p></div>
                <div className="card"><div className="icon">📲</div><h3>Pedido en WhatsApp</h3><p>Selecciona productos, arma tu pedido y envíalo con un toque.</p></div>
              </div>
              <button type="button" className="btn primary" onClick={() => sixProduct && openProduct(sixProduct)}>Quiero mi six</button>
            </div>
          </div>
        </div>
      </ScrollScene>

      {/* Escena 3 — Malteadas */}
      <ScrollScene id="malteadas">
        <div className="container sceneGrid">
          <div className="sceneMedia" style={{ aspectRatio: '4 / 5' }}>
            {shakeProduct?.image ? <Image src={shakeProduct.image} alt="Malteada Club BASA" fill sizes="(max-width: 850px) 100vw, 50vw" /> : <div className="menuImageEmpty" style={{ position: 'absolute', inset: 0 }}>Sin imagen</div>}
          </div>
          <div>
            <span className="sceneEyebrow">Bebidas</span>
            <h2>Malteadas preparadas al momento</h2>
            <p>{shakeProduct?.description || 'Preparada al momento.'}</p>
            <div className="scenePrice">{shakeProduct?.price ? `$${shakeProduct.price}` : 'Consultar'}</div>
            {specialProduct && <p className="small">¿Buscas algo distinto? Pregunta por la {specialProduct.name.toLowerCase()}.</p>}
            <button type="button" className="btn primary" style={{ marginTop: 14 }} onClick={() => shakeProduct && openProduct(shakeProduct)}>Quiero mi malteada</button>
          </div>
        </div>
      </ScrollScene>

      {/* Escena 4 — Categorías: introducción, no catálogo completo */}
      <ScrollScene id="categorias">
        <div className="container">
          <div className="sectionHead"><h2>Y hay mucho más en el menú</h2><p>Waffles, crepas y especialidades para cada antojo.</p></div>
          <div className="grid3">
            <div className="card">
              {waffleProduct?.image && <div className="sceneMedia" style={{ aspectRatio: '1 / 1', marginBottom: 14 }}><Image src={waffleProduct.image} alt="Waffle Club BASA" fill sizes="(max-width: 850px) 100vw, 33vw" /></div>}
              <h3>Waffle</h3><p>{waffleProduct?.price ? `$${waffleProduct.price}` : 'Consultar'}</p>
            </div>
            <div className="card">
              {crepaProduct?.image && <div className="sceneMedia" style={{ aspectRatio: '1 / 1', marginBottom: 14 }}><Image src={crepaProduct.image} alt="Crepa Club BASA" fill sizes="(max-width: 850px) 100vw, 33vw" /></div>}
              <h3>Crepa</h3><p>{crepaProduct?.price ? `$${crepaProduct.price}` : 'Consultar'}</p>
            </div>
            <div className="card"><div className="icon">🌯</div><h3>Especialidades</h3><p>Rollitos salados y más, sobre pedido.</p></div>
          </div>
          <div style={{ marginTop: 32, textAlign: 'center' }}><a className="btn primary" href="#menu" onClick={() => track('cta_ver_menu_categorias')}>Ver todo el menú</a></div>
        </div>
      </ScrollScene>

      {/* Catálogo completo — SIN scroll-snap, navegación libre y rápida (sin cambios funcionales) */}
      <section id="menu"><Reveal><div className="container"><div className="sectionHead"><h2>Catálogo interactivo</h2><p>Productos y precios administrados desde Firestore. Si Firebase no está disponible, se muestra un catálogo de respaldo.</p></div>
        <div className="categoryTabsWrap"><div className="categoryTabs" ref={categoryTabsRef} role="tablist" aria-label="Categorías del menú"><button className={activeCategory === 'Todos' ? 'active' : ''} onClick={() => setActiveCategory('Todos')}>Todos</button>{categories.filter((category) => !isInternalCategory(category.id)).map((category) => <button key={category.id} className={activeCategory === category.name ? 'active' : ''} onClick={() => setActiveCategory(category.name)}>{category.name}</button>)}</div>{showTabsFade && <div className="categoryTabsFade" aria-hidden="true">›</div>}</div>
        <div className="catalogStatus">{catalogStatus === 'firestore' ? '● Catálogo actualizado' : catalogStatus === 'loading' ? 'Cargando catálogo…' : '● Mostrando catálogo de respaldo'}</div>
        <div className="menuGrid">{visibleProducts.map((product) => <article className="menuCard" key={product.id} role="button" tabIndex={0} aria-label={`Ver detalles de ${product.name}`} onClick={() => openProduct(product)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openProduct(product); } }}>
          {product.image ? <div className="menuImage" onClick={(event) => { event.stopPropagation(); openProduct(product); }}><Image src={product.image} alt={product.name} fill sizes="(max-width: 560px) 100vw, 33vw"/></div> : <div className="menuImage menuImageEmpty" aria-hidden="true">Sin imagen</div>}
          <div className="menuTop"><strong>{product.name}</strong>{!isInternalCategory(product.category) && <span className="tag">{product.category}</span>}</div><p>{product.description}</p>{product.availability && <span className="small">{product.availability}</span>}<div className="menuPrice">{product.price ? `$${product.price}` : 'Consultar'}</div><div className="qty"><button aria-label={`Quitar ${product.name}`} onClick={(event) => { event.stopPropagation(); add(product.id, -1); }}>−</button><span>{cart[product.id] || 0}</span><button aria-label={`Agregar ${product.name}`} onClick={(event) => { event.stopPropagation(); add(product.id, 1); track('add_to_cart', { product: product.name }); }}>+</button></div>
        </article>)}</div>
        {items.length > 0 && <div className="cart"><div><strong>{items.reduce((sum, item) => sum + item.qty, 0)} productos</strong><br/><span>${total} + envío por confirmar</span></div><button className="btn" onClick={() => { track('whatsapp_order', { value: total }); window.location.href = waLink(buildOrder(items)); }}>Enviar pedido por WhatsApp</button></div>}
      </div></Reveal></section>

      {/* Escena 5 — Experiencia Club BASA: solo fotos reales, sin testimonios inventados */}
      <ScrollScene id="experiencia">
        <div className="container">
          <div className="sectionHead"><h2>La experiencia Club BASA</h2><p>Sabor, cercanía y confianza en cada pedido.</p></div>
          <div className="grid3">
            {menuPosterProduct?.image && <div className="sceneMedia" style={{ aspectRatio: '3 / 4' }}><Image src={menuPosterProduct.image} alt="Menú saludable Club BASA" fill sizes="(max-width: 850px) 100vw, 33vw" /></div>}
            <div className="sceneMedia" style={{ aspectRatio: '3 / 4' }}><Image src={heroImage} alt="Panquecitos Club BASA" fill sizes="(max-width: 850px) 100vw, 33vw" /></div>
            {specialProduct?.image && <div className="sceneMedia" style={{ aspectRatio: '3 / 4' }}><Image src={specialProduct.image} alt={specialProduct.name} fill sizes="(max-width: 850px) 100vw, 33vw" /></div>}
          </div>
          <div className="sceneSub">
            <div className="sectionHead"><h2>Comparte Club BASA</h2><p>Envíale la página a quien siempre pregunta “¿dónde compraste eso?”</p></div>
            <div className="socials"><button className="social" onClick={share}>📤 Compartir</button><a className="social" href={whatsappShareUrl}>WhatsApp</a><a className="social" href="https://www.facebook.com/sharer/sharer.php" target="_blank" rel="noreferrer">Facebook</a><a className="social" href="https://twitter.com/intent/tweet" target="_blank" rel="noreferrer">X</a></div>
          </div>
        </div>
      </ScrollScene>

      {/* Escena 6 — Pedido: CTA final + logística (envíos/FAQ/contacto) integrados, scroll normal debajo del CTA */}
      <ScrollScene id="pedido">
        <div className="container">
          <div className="sectionHead" style={{ textAlign: 'center', margin: '0 auto 30px', maxWidth: 640 }}>
            <h2>¿Listo para probar Club BASA?</h2>
            <p>Arma tu pedido y lo confirmamos por WhatsApp en minutos.</p>
          </div>
          <div className="actions" style={{ justifyContent: 'center' }}>
            <a className="btn primary" href={waLink('Hola Club BASA, quiero hacer un pedido.')} onClick={() => track('cta_whatsapp_final')}>Pedir por WhatsApp</a>
            <a className="btn secondary" href="#menu" onClick={() => track('cta_menu_final')}>Ver menú</a>
          </div>

          <div id="envios" className="sceneSub">
            <div className="sectionHead"><h2>Envío a domicilio en Acapulco</h2><p>El reparto lo realiza un servicio externo a Club BASA. Para cotizar con precisión, necesitamos tu ubicación de Google Maps o WhatsApp.</p></div>
            <div className="grid3">
              <div className="card"><h3>$60 aprox.</h3><p>Zona cercana a La Garita, incluyendo referencias como VIPS de La Diana, Costera 125, Roble, Anclas y Laja.</p></div>
              <div className="card"><h3>$80 aprox.</h3><p>Progreso, zona Centro, Zócalo, Costa Azul y zonas dentro de ese rango.</p></div>
              <div className="card"><h3>¿Fuera de zona?</h3><p>Envíanos tu ubicación. El repartidor cotiza el costo antes de confirmar.</p><a className="btn primary" href={waLink('Hola Club BASA, quiero cotizar mi envío. Les comparto mi ubicación.')}>Cotizar envío</a></div>
            </div>
          </div>

          <div id="faq" className="sceneSub">
            <div className="sectionHead"><h2>Preguntas frecuentes</h2></div>
            <div className="faq">
              <details><summary>¿Cuánto cuesta el six?</summary><p>El six cuesta $150 e incluye recipiente y papel grado alimenticio.</p></details>
              <details><summary>¿Qué recibo en mi primera compra?</summary><p>En la primera compra del six recibes un café de grano arábica.</p></details>
              <details><summary>¿Puedo comprar una sola pieza?</summary><p>Sí, la pieza individual cuesta $25, sujeta a disponibilidad de 8:00 a 11:00 h.</p></details>
              <details><summary>¿Tienen envío?</summary><p>Sí. El reparto es externo a Club BASA. Se cotiza con tu ubicación.</p></details>
              <details><summary>¿Puedo pedir sobre pedido?</summary><p>Sí, de hecho es lo recomendado para asegurar disponibilidad.</p></details>
            </div>
          </div>

          <div id="contacto" className="sceneSub contact">
            <div><div className="sectionHead"><h2>¿Quieres recibir promociones?</h2><p>Regístrate para acceder a promociones especiales y novedades.</p></div><a className="btn primary" href="/registro" onClick={() => track('cta_crear_cuenta')}>Crear mi cuenta</a></div>
            <ContactForm/>
          </div>
        </div>
      </ScrollScene>
    </main>

    {selectedProduct && <div className="productModalBackdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedProduct(null); }}>
      <section className="productModal" role="dialog" aria-modal="true" aria-labelledby="product-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="productModalClose" aria-label="Cerrar detalles del producto" onClick={() => setSelectedProduct(null)}>×</button>
        {selectedProduct.image ? <div
          ref={productImageRef}
          className="productModalImage"
          onMouseDown={onImageMouseDown}
          onMouseMove={onImageMouseMove}
          onMouseUp={stopPanningImage}
          onMouseLeave={stopPanningImage}
          onDoubleClick={resetImageZoom}
          style={{ cursor: imageZoom > 1 ? (isPanningImage ? 'grabbing' : 'grab') : 'zoom-in' }}
        ><Image
          src={selectedProduct.image}
          alt={selectedProduct.name}
          fill
          sizes="(max-width: 760px) 100vw, 760px"
          priority
          draggable={false}
          style={{ transform: `translate(${imagePan.x}px, ${imagePan.y}px) scale(${imageZoom})`, transition: isPanningImage ? 'none' : 'transform .15s ease-out' }}
        /></div> : <div className="productModalImage productModalImageEmpty">Sin imagen disponible</div>}
        <div className="productModalBody">
          <div className="menuTop"><h2 id="product-modal-title">{selectedProduct.name}</h2>{!isInternalCategory(selectedProduct.category) && <span className="tag">{selectedProduct.category}</span>}</div>
          <p className="productModalDescription">{selectedProduct.description}</p>
          {selectedProduct.availability && <span className="small">{selectedProduct.availability}</span>}
          <div className="productModalPrice">{selectedProduct.price ? `$${selectedProduct.price}` : 'Consultar'}</div>

          {selectedVideo && <div className="productVideoSection">
            <div className="productVideoHeader"><strong>Video del producto</strong><span>{selectedProduct.videoProvider === 'google-drive' ? 'Google Drive' : selectedProduct.videoProvider === 'vimeo' ? 'Vimeo' : selectedProduct.videoProvider === 'youtube' ? 'YouTube' : 'Video'}</span></div>
            <div className="productVideoFrame">
              {selectedVideo.kind === 'iframe'
                ? <iframe src={selectedVideo.src} title={`Video de ${selectedProduct.name}`} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
                              : <video src={selectedVideo.src} controls playsInline preload="metadata" controlsList={selectedProduct.videoDownloadable === false ? 'nodownload' : undefined} onContextMenu={selectedProduct.videoDownloadable === false ? (event) => event.preventDefault() : undefined} />}
            </div>
          </div>}

          <div className="productModalActions"><button aria-label={`Quitar ${selectedProduct.name}`} onClick={() => add(selectedProduct.id, -1)}>−</button><span>{cart[selectedProduct.id] || 0}</span><button aria-label={`Agregar ${selectedProduct.name}`} onClick={() => { add(selectedProduct.id, 1); track('add_to_cart', { product: selectedProduct.name }); }}>+</button></div>
          <button className="btn primary productModalAdd" onClick={() => add(selectedProduct.id, 1)}>Agregar al carrito</button>
        </div>
      </section>
    </div>}
  </>;
}
