'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getCatalog, getFallbackCategories, getFallbackProducts, type CatalogProduct } from '@/lib/catalog';
import { getProductVideoEmbed } from '@/lib/video';
import { buildOrder, waLink } from '@/lib/whatsapp';
import { track } from '@/lib/analytics';
import { useCart } from '@/hooks/useCart';
import { getVariantGroup, resolveVariantPrice } from '@/lib/variants';
import { getCombo, buildComboLine, type ComboSlotOption } from '@/lib/combos';
import type { CartLine, VariantCartLine } from '@/lib/cart';
import Reveal from '@/components/Reveal';
import ScrollScene from '@/components/ScrollScene';
import ContactForm from '@/components/ContactForm';
import VariantPicker from '@/components/VariantPicker';
import ComboBuilder from '@/components/ComboBuilder';
import CartDrawer from '@/components/CartDrawer';

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
  const {
    lines: cartLines, subtotal, count: cartCount,
    addSimple, addVariant, addCombo, setQty: setCartQty,
    remove: removeCartLine, clear: clearCartLines, duplicate: duplicateCartLine,
    replaceVariant, replaceCombo,
  } = useCart(products);
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [openComboId, setOpenComboId] = useState<string | null>(null);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editingComboSelections, setEditingComboSelections] = useState<Record<string, ComboSlotOption | null> | null>(null);
  const closedViaBackRef = useRef(false);
  // zoom+pan live in one state object so the wheel handler below can update
  // both in a single, pure setState call (see react-doctor/no-impure-state-updater).
  const [imageView, setImageView] = useState({ zoom: 1, pan: { x: 0, y: 0 } });
  const [isPanningImage, setIsPanningImage] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const productImageRef = useRef<HTMLDivElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const categoryTabsRef = useRef<HTMLDivElement>(null);
  const [showTabsFade, setShowTabsFade] = useState(false);
  const [heroPassed, setHeroPassed] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const stored = localStorage.getItem('clubbasa-theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(stored === 'dark' || stored === 'light' ? stored : (systemDark ? 'dark' : 'light'));
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('clubbasa-theme', next);
  };

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
    setImageView({ zoom: 1, pan: { x: 0, y: 0 } });
  }, [selectedProduct]);

  useEffect(() => {
    const el = productImageRef.current;
    if (!el) return;
    // React attaches onWheel as a passive listener by default, which silently
    // ignores preventDefault() — attach natively so zooming doesn't also scroll the page.
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      setImageView((view) => {
        const nextZoom = Math.min(4, Math.max(1, view.zoom - event.deltaY * 0.0015));
        return { zoom: nextZoom, pan: nextZoom === 1 ? { x: 0, y: 0 } : clampPan(view.pan, nextZoom) };
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
    if (!selectedProduct) setEditingLineId(null);
  }, [selectedProduct]);

  useEffect(() => {
    if (!cartDrawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCartDrawerOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [cartDrawerOpen]);

  useEffect(() => {
    const hero = document.getElementById('hero');
    if (!hero) return;
    const io = new IntersectionObserver(([entry]) => setHeroPassed(!entry.isIntersecting), { threshold: 0 });
    io.observe(hero);
    return () => io.disconnect();
  }, []);

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
  const quantityFor = (productId: string) => cartLines.find((line) => line.kind === 'simple' && line.productId === productId)?.qty || 0;
  const variantQtyFor = (productId: string) => cartLines.filter((line) => line.kind === 'variant' && line.productId === productId).reduce((sum, line) => sum + line.qty, 0);
  const addProduct = (product: CatalogProduct, delta: number) => {
    if (delta > 0) { addSimple(product, delta); return; }
    const line = cartLines.find((l) => l.kind === 'simple' && l.productId === product.id);
    if (line) setCartQty(line.lineId, line.qty + delta);
  };
  const incrementLine = (lineId: string) => {
    const line = cartLines.find((l) => l.lineId === lineId);
    if (line) setCartQty(lineId, line.qty + 1);
  };
  const decrementLine = (lineId: string) => {
    const line = cartLines.find((l) => l.lineId === lineId);
    if (line) setCartQty(lineId, line.qty - 1);
  };
  const handleCheckout = () => {
    track('whatsapp_order', { value: subtotal });
    window.location.href = waLink(buildOrder(cartLines));
  };
  const handleEditLine = (line: CartLine) => {
    if (line.kind === 'variant') {
      const product = products.find((p) => p.id === line.productId);
      if (!product) return;
      setEditingLineId(line.lineId);
      setSelectedProduct(product);
      setCartDrawerOpen(false);
      return;
    }
    if (line.kind === 'combo') {
      const combo = getCombo(line.comboId);
      if (!combo) return;
      const selections: Record<string, ComboSlotOption | null> = {};
      combo.slots.forEach((slot) => {
        const component = line.components.find((c) => c.slotId === slot.id);
        selections[slot.id] = component
          ? slot.options.find((option) => option.productId === component.productId && option.variantId === component.variantId) ?? null
          : null;
      });
      setEditingLineId(line.lineId);
      setEditingComboSelections(selections);
      setOpenComboId(line.comboId);
      setCartDrawerOpen(false);
    }
  };
  const openProduct = (product: CatalogProduct) => {
    setSelectedProduct(product);
    track('view_product', { product: product.id });
  };
  const openMenu = () => {
    setMenuOpen(true);
    // El catálogo tarda un frame en desplegarse; esperamos a que pinte para no hacer scroll a una sección todavía colapsada.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
  };
  const clampPan = (pan: { x: number; y: number }, zoom: number) => {
    const max = (zoom - 1) * 160;
    return { x: Math.min(max, Math.max(-max, pan.x)), y: Math.min(max, Math.max(-max, pan.y)) };
  };
  const onImageMouseDown = (event: React.MouseEvent) => {
    if (imageView.zoom <= 1) return;
    event.preventDefault();
    setIsPanningImage(true);
    panStartRef.current = { x: event.clientX, y: event.clientY, panX: imageView.pan.x, panY: imageView.pan.y };
  };
  const onImageMouseMove = (event: React.MouseEvent) => {
    if (!isPanningImage) return;
    const start = panStartRef.current;
    setImageView((view) => ({ ...view, pan: clampPan({ x: start.panX + (event.clientX - start.x), y: start.panY + (event.clientY - start.y) }, view.zoom) }));
  };
  const stopPanningImage = () => setIsPanningImage(false);
  const resetImageZoom = () => setImageView({ zoom: 1, pan: { x: 0, y: 0 } });
  const share = async () => {
    const data = { title: 'Club BASA Acapulco', text: 'Mira el menú de Club BASA 👇', url: window.location.href };
    if (navigator.share) await navigator.share(data); else await navigator.clipboard.writeText(window.location.href);
    track('share_landing');
  };
  const shareProduct = async (product: CatalogProduct, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const btn = event.currentTarget;
    btn.classList.add('shareBtnSent');
    setTimeout(() => btn.classList.remove('shareBtnSent'), 700);
    const text = `Mira ${product.name} de Club BASA Acapulco${product.price ? ` — $${product.price}` : ''}: ${siteUrl}`;
    const isWindowsDesktop = window.innerWidth > 850 && /Windows/i.test(navigator.userAgent);
    try {
      if (navigator.share && !isWindowsDesktop) await navigator.share({ title: 'Club BASA Acapulco', text, url: siteUrl });
      else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    } catch { /* el usuario canceló el cuadro nativo de compartir */ }
    track('share_product', { product: product.id });
  };
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(`Mira el menú de Club BASA Acapulco: ${siteUrl}`)}`;
  const selectedVideo = selectedProduct ? getProductVideoEmbed(selectedProduct.videoProvider, selectedProduct.videoUrl) : null;
  const selectedVariantGroup = selectedProduct ? getVariantGroup(selectedProduct.id) : undefined;
  const editingVariantLine = editingLineId ? cartLines.find((line): line is VariantCartLine => line.lineId === editingLineId && line.kind === 'variant') : undefined;

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
  const teaProduct = products.find((p) => p.id === 'tea');
  const aloeProduct = products.find((p) => p.id === 'aloe');
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
      <nav className="navlinks"><a href="#menu" onClick={(event) => { event.preventDefault(); openMenu(); }}>Menú</a><a href="#beneficios">Beneficios</a><a href="#envios">Envíos</a><a href="#faq">FAQ</a><a href="/blog">Blog</a><a href="#contacto">Contacto</a><a href="/mi-cuenta">Mi cuenta</a></nav>
      <a className="navcta" href={waLink('Hola Club BASA, quiero hacer un pedido.')} onClick={() => track('cta_click', { cta: 'header_order' })}>◔ &nbsp;Pedir por WhatsApp</a>
      <button type="button" className="themeToggle" aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'} onClick={toggleTheme}>
        {theme === 'dark'
          ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
          : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.5A8.5 8.5 0 1 1 11.5 3a7 7 0 0 0 9.5 9.5z"/></svg>}
      </button>
      <button type="button" className="navToggle" aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={mobileMenuOpen} aria-controls="mobile-menu" onClick={() => setMobileMenuOpen((open) => !open)}>{mobileMenuOpen ? '✕' : '☰'}</button>
    </div>
    {mobileMenuOpen && <nav id="mobile-menu" className="mobileMenu" aria-label="Menú móvil" onClick={() => setMobileMenuOpen(false)}>
      <a href="#menu" onClick={(event) => { event.preventDefault(); openMenu(); }}>Menú</a><a href="#beneficios">Beneficios</a><a href="#envios">Envíos</a><a href="#faq">FAQ</a><a href="/blog">Blog</a><a href="#contacto">Contacto</a><a href="/mi-cuenta">Mi cuenta</a>
    </nav>}
    </header>

    <main id="inicio">
      {/* Escena 1 — Hero: se mantiene la implementación full-bleed original (ya tenía min-height:100vh y fade-in propio), solo se agrega scroll-snap y se reordenan los CTA por prioridad de conversión. */}
      <section id="hero" className="hero heroFull"><Image className="heroImage" src={heroImage} alt="Six de panquecitos Club BASA Acapulco" fill priority sizes="100vw" quality={82}/><div className="heroShade" aria-hidden="true"/><div className="container heroContent"><div className="heroCopy reveal">
        <span className="eyebrow heroEyebrow">Club BASA Acapulco</span><h1>Sabor que<br/>enamora.<br/>Nutrición que<br/><em>transforma.</em></h1>
        <p>Malteadas, panquecitos, crepas, waffles y opciones para disfrutar tu desayuno, con la nutrición Herbalife que ya conoces.</p>
        <div className="actions"><a className="btn primary heroCtaPulse" href={waLink('Hola Club BASA, quiero hacer un pedido.')} onClick={() => track('cta_click', { cta: 'hero_order' })}><span className="heroCtaIcon" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12c0 1.9.5 3.7 1.5 5.3L2 22l4.9-1.3c1.5.8 3.2 1.3 5.1 1.3 5.5 0 10-4.5 10-10S17.5 2 12 2zm5.6 14.2c-.2.6-1.2 1.2-1.7 1.3-.4.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.5-2.6-1.1-4.3-3.8-4.4-4-.1-.2-1-1.3-1-2.5s.6-1.8.9-2c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.4.2.5.7 1.8.8 1.9.1.2.1.4 0 .6-.1.2-.2.3-.3.5-.2.2-.3.3-.5.5-.2.2-.3.4-.1.7.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.5 1.6.3.1.5.1.6-.1.2-.2.7-.8.9-1.1.2-.3.4-.2.6-.1.2.1 1.5.7 1.7.8.2.1.4.2.4.3.1.2.1.7-.1 1.3z"/></svg></span>Pedir ahora</a><a className="btn secondary heroSecondary" href="#menu" onClick={(event) => { event.preventDefault(); track('cta_click', { cta: 'hero_menu' }); openMenu(); }}>Ver menú</a></div>
        <p className="heroCtaNote"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9"/></svg>Confirmamos tu pedido por WhatsApp en minutos</p>
        <div className="heroTrust"><span>◯ <b>Sin harinas</b><small>ni aceite</small></span><span>◉ <b>Altos en</b><small>proteína</small></span><span>♡ <b>Hechos con</b><small>nutrición Herbalife</small></span></div>
      </div></div>
      <div className="heroOffer container"><div className="offerItem"><div className="offerIcon">☕</div><div><strong>Primera compra de six</strong><p>Incluye recipiente + papel grado alimenticio<br/>y café de grano arábica de regalo.</p></div></div><div className="offerItem offerPrice"><div className="offerIcon">▣</div><div><strong>Six de panquecitos</strong><b>{sixProduct?.price ? `$${sixProduct.price}` : 'Consultar'}</b></div></div><div className="offerItem"><div className="offerIcon">🛵</div><div><strong>Envío a domicilio</strong><p>Zona cercana $60 • Zona ampliada $80<br/>Fuera de zona: cotización personalizada.</p></div></div></div></section>

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
              <div id="beneficios" className="grid3" style={{ margin: '10px 0 28px', gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <div className="card"><div className="icon">🧁</div><h3>6 piezas</h3><p>En recipiente con papel grado alimenticio.</p></div>
                <div className="card"><div className="icon">📲</div><h3>Pedido en WhatsApp</h3><p>Arma tu pedido y envíalo con un toque.</p></div>
              </div>
              <button type="button" className="btn primary" onClick={() => { track('cta_click', { cta: 'six_order' }); sixProduct && openProduct(sixProduct); }}>Quiero mi six</button>
            </div>
          </div>
        </div>
      </ScrollScene>

      {/* Escena 3 — Arma tu desayuno: cross-sell de bebidas reales complementarias al six (no repite al six como protagonista). La oferta de bienvenida (café de regalo) se conserva como incentivo secundario, no como segunda venta. */}
      <ScrollScene id="desayuno">
        <div className="container">
          <div className="sectionHead"><h2>Arma tu desayuno</h2><p>Completa tu six con una bebida preparada al momento.</p></div>
          <div className="grid3">
            <div className="card cardClickable" role="button" tabIndex={0} aria-label="Armar mi desayuno con malteada" onClick={() => { track('cta_click', { cta: 'breakfast_order' }); setOpenComboId('arma-tu-desayuno'); }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); track('cta_click', { cta: 'breakfast_order' }); setOpenComboId('arma-tu-desayuno'); } }}>
              {shakeProduct?.image && <div className="sceneMedia" style={{ aspectRatio: '1 / 1', marginBottom: 14 }}><Image src={shakeProduct.image} alt="Malteada Club BASA" fill sizes="(max-width: 850px) 100vw, 33vw" /></div>}
              <h3>Malteada</h3><p>{shakeProduct?.price ? `$${shakeProduct.price}` : 'Consultar'}</p>
            </div>
            <div className="card cardClickable" role="button" tabIndex={0} aria-label="Armar mi desayuno con té" onClick={() => { track('cta_click', { cta: 'breakfast_order' }); setOpenComboId('arma-tu-desayuno'); }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); track('cta_click', { cta: 'breakfast_order' }); setOpenComboId('arma-tu-desayuno'); } }}>
              {teaProduct?.image && <div className="sceneMedia" style={{ aspectRatio: '1 / 1', marginBottom: 14 }}><Image src={teaProduct.image} alt="Té Club BASA" fill sizes="(max-width: 850px) 100vw, 33vw" /></div>}
              <h3>Té</h3><p>{teaProduct?.price ? `$${teaProduct.price}` : 'Consultar'}</p>
            </div>
            <div className="card cardClickable" role="button" tabIndex={0} aria-label="Armar mi desayuno con aloe" onClick={() => { track('cta_click', { cta: 'breakfast_order' }); setOpenComboId('arma-tu-desayuno'); }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); track('cta_click', { cta: 'breakfast_order' }); setOpenComboId('arma-tu-desayuno'); } }}>
              {aloeProduct?.image && <div className="sceneMedia" style={{ aspectRatio: '1 / 1', marginBottom: 14 }}><Image src={aloeProduct.image} alt="Aloe Club BASA" fill sizes="(max-width: 850px) 100vw, 33vw" /></div>}
              <h3>Aloe</h3><p>{aloeProduct?.price ? `$${aloeProduct.price}` : 'Consultar'}</p>
            </div>
          </div>
          <p className="small" style={{ marginTop: 22, color: 'var(--muted)' }}>Además, en tu primera compra del six te regalamos café de grano arábica.</p>
          <div style={{ marginTop: 20, textAlign: 'center' }}><button type="button" className="btn primary" onClick={() => { track('cta_click', { cta: 'breakfast_order' }); setOpenComboId('arma-tu-desayuno'); }}>Armar mi desayuno</button></div>
        </div>
      </ScrollScene>

      {/* Escena 4 — Descubrir el menú: mapa de categorías reales para aumentar ticket promedio, no el catálogo completo. Se quita panquecitos de esta grilla (ya fue protagonista en la Escena 2) y se usa una grilla de 4 columnas, más densa que la de 3 de la Escena 3, para que no se sienta igual escena tras escena. */}
      <ScrollScene id="categorias">
        <div className="container">
          <div className="sectionHead"><h2>Y hay mucho más para pedir</h2><p>Malteadas, waffles, crepas y especialidades.</p></div>
          <div className="grid4">
            <div className="card">
              {shakeProduct?.image && <div className="sceneMedia" style={{ aspectRatio: '1 / 1', marginBottom: 14 }}><Image src={shakeProduct.image} alt="Malteada Club BASA" fill sizes="(max-width: 850px) 100vw, 25vw" /></div>}
              <h3>Malteadas</h3><p>{shakeProduct?.price ? `$${shakeProduct.price}` : 'Consultar'}</p>
            </div>
            <div className="card">
              {waffleProduct?.image && <div className="sceneMedia" style={{ aspectRatio: '1 / 1', marginBottom: 14 }}><Image src={waffleProduct.image} alt="Waffle Club BASA" fill sizes="(max-width: 850px) 100vw, 25vw" /></div>}
              <h3>Waffles</h3><p>{waffleProduct?.price ? `$${waffleProduct.price}` : 'Consultar'}</p>
            </div>
            <div className="card">
              {crepaProduct?.image && <div className="sceneMedia" style={{ aspectRatio: '1 / 1', marginBottom: 14 }}><Image src={crepaProduct.image} alt="Crepa Club BASA" fill sizes="(max-width: 850px) 100vw, 25vw" /></div>}
              <h3>Crepas</h3><p>{crepaProduct?.price ? `$${crepaProduct.price}` : 'Consultar'}</p>
            </div>
            <div className="card">
              {specialProduct?.image ? <div className="sceneMedia" style={{ aspectRatio: '1 / 1', marginBottom: 14 }}><Image src={specialProduct.image} alt="Especialidades Club BASA" fill sizes="(max-width: 850px) 100vw, 25vw" /></div> : <div className="icon">🌯</div>}
              <h3>Especialidades</h3><p>Rollitos salados y más, sobre pedido.</p>
            </div>
          </div>
          <div style={{ marginTop: 32, textAlign: 'center' }}><button type="button" className="btn primary" aria-expanded={menuOpen} aria-controls="menu" onClick={() => { track('cta_click', { cta: 'menu_explore' }); if (menuOpen) setMenuOpen(false); else openMenu(); }}>{menuOpen ? 'Ocultar menú' : 'Ver todo el menú'}</button></div>
        </div>
      </ScrollScene>

      {/* Catálogo completo — SIN scroll-snap, navegación libre y rápida. Colapsado por defecto: se despliega desde cualquier CTA "Ver menú" del sitio (todas llaman a openMenu()) y se repliega solo con el botón de la Escena 4. La <section id="menu"> se mantiene siempre en el DOM para que el scroll a #menu tenga un destino estable incluso colapsada. */}
      <section id="menu" style={menuOpen ? undefined : { padding: 0 }}>{menuOpen && <Reveal><div className="container"><div className="sectionHead"><h2>Catálogo interactivo</h2><p>Productos y precios administrados desde Firestore. Si Firebase no está disponible, se muestra un catálogo de respaldo.</p></div>
        <div className="categoryTabsWrap"><div className="categoryTabs" ref={categoryTabsRef} role="tablist" aria-label="Categorías del menú"><button className={activeCategory === 'Todos' ? 'active' : ''} onClick={() => setActiveCategory('Todos')}>Todos</button>{categories.filter((category) => !isInternalCategory(category.id)).map((category) => <button key={category.id} className={activeCategory === category.name ? 'active' : ''} onClick={() => setActiveCategory(category.name)}>{category.name}</button>)}</div>{showTabsFade && <div className="categoryTabsFade" aria-hidden="true">›</div>}</div>
        <div className="catalogStatus">{catalogStatus === 'firestore' ? '● Catálogo actualizado' : catalogStatus === 'loading' ? 'Cargando catálogo…' : '● Mostrando catálogo de respaldo'}</div>
        <div className="menuGrid">{visibleProducts.map((product) => <article className="menuCard" key={product.id} role="button" tabIndex={0} aria-label={`Ver detalles de ${product.name}`} onClick={() => openProduct(product)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openProduct(product); } }}>
          {product.image ? <div className="menuImage" onClick={(event) => { event.stopPropagation(); openProduct(product); }}><Image src={product.image} alt={product.name} fill sizes="(max-width: 560px) 100vw, 33vw"/><button type="button" className="shareBtn" aria-label={`Compartir ${product.name}`} onClick={(event) => shareProduct(product, event)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button></div> : <div className="menuImage menuImageEmpty"><span aria-hidden="true">Sin imagen</span><button type="button" className="shareBtn" aria-label={`Compartir ${product.name}`} onClick={(event) => shareProduct(product, event)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button></div>}
          <div className="menuTop"><strong>{product.name}</strong>{!isInternalCategory(product.category) && <span className="tag">{product.category}</span>}</div><p>{product.description}</p>{product.availability && <span className="small">{product.availability}</span>}<div className="menuPrice">{product.price ? `$${product.price}` : 'Consultar'}</div>{getVariantGroup(product.id) ? <button type="button" className="btn primary menuCardVariantCta" onClick={(event) => { event.stopPropagation(); openProduct(product); }}>{variantQtyFor(product.id) > 0 ? `${variantQtyFor(product.id)} en tu pedido — Elegir` : 'Elegir opciones'}</button> : <div className="qty"><button aria-label={`Quitar ${product.name}`} onClick={(event) => { event.stopPropagation(); addProduct(product, -1); }}>−</button><span>{quantityFor(product.id)}</span><button aria-label={`Agregar ${product.name}`} onClick={(event) => { event.stopPropagation(); addProduct(product, 1); track('add_to_cart', { product: product.id }); }}>+</button></div>}
        </article>)}</div>
      </div></Reveal>}</section>

      {/* Escena 5 — Experiencia Club BASA: solo fotos reales, sin testimonios inventados */}
      <ScrollScene id="experiencia">
        <div className="container">
          <div className="sectionHead"><h2>La experiencia Club BASA</h2><p>Sabor, cercanía y confianza en cada pedido.</p></div>
          <div className="grid3">
            {menuPosterProduct?.image && <div className="sceneMedia" style={{ aspectRatio: '3 / 4' }}><Image src={menuPosterProduct.image} alt="Menú saludable Club BASA" fill sizes="(max-width: 850px) 100vw, 33vw" /></div>}
            <div className="sceneMedia" style={{ aspectRatio: '3 / 4' }}><Image src={heroImage} alt="Panquecitos Club BASA" fill sizes="(max-width: 850px) 100vw, 33vw" /></div>
            {specialProduct?.image && <div className="sceneMedia" style={{ aspectRatio: '3 / 4' }}><Image src={specialProduct.image} alt={specialProduct.name} fill sizes="(max-width: 850px) 100vw, 33vw" /></div>}
          </div>
          <div className="sceneSub" style={{ display: 'flex', flexWrap: 'wrap', gap: 32, justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="sectionHead"><h2>Comparte Club BASA</h2><p>Envíale la página a quien siempre pregunta “¿dónde compraste eso?”</p></div>
              <div className="socials"><button className="social" onClick={share}>📤 Compartir</button><a className="social" href={whatsappShareUrl}>WhatsApp</a><a className="social" href="https://www.facebook.com/sharer/sharer.php" target="_blank" rel="noreferrer">Facebook</a><a className="social" href="https://twitter.com/intent/tweet" target="_blank" rel="noreferrer">X</a></div>
            </div>
            <div>
              <div className="sectionHead"><h2>Contáctanos directo</h2><p>Dudas sobre tu pedido o disponibilidad, escríbenos por WhatsApp.</p></div>
              <a className="btn secondary" href={waLink('Hola Club BASA, tengo una duda.')} onClick={() => track('cta_click', { cta: 'experiencia_contacto' })}>Escribir por WhatsApp</a>
            </div>
          </div>
        </div>
      </ScrollScene>

      {/* Escena 6 — Pedido: CTA final + logística (envíos/FAQ/contacto) integrados, scroll normal debajo del CTA */}
      <ScrollScene id="pedido">
        <div className="container">
          <div className="sectionHead" style={{ textAlign: 'center', margin: '0 auto 30px', maxWidth: 640 }}>
            <h2>¿Qué se te antoja hoy?</h2>
            <p>Arma tu pedido y lo confirmamos por WhatsApp en minutos.</p>
          </div>
          <div className="actions" style={{ justifyContent: 'center' }}>
            <a className="btn primary" href={waLink('Hola Club BASA, quiero hacer un pedido.')} onClick={() => track('cta_click', { cta: 'final_order' })}>◔ &nbsp;Pedir ahora</a>
            <a className="btn secondary" href="#menu" onClick={(event) => { event.preventDefault(); track('cta_click', { cta: 'final_menu' }); openMenu(); }}>Ver menú</a>
          </div>

          <div id="envios" className="sceneSub">
            <div className="sectionHead"><h2>Envío a domicilio en Acapulco</h2><p>El reparto lo realiza un servicio externo a Club BASA. Para cotizar con precisión, necesitamos tu ubicación de Google Maps o WhatsApp.</p></div>
            <div className="grid3">
              <div className="card"><h3>$60 aprox.</h3><p>Zona cercana a La Garita, incluyendo referencias como VIPS de La Diana, Costera 125, Roble, Anclas y Laja.</p></div>
              <div className="card"><h3>$80 aprox.</h3><p>Progreso, zona Centro, Zócalo, Costa Azul y zonas dentro de ese rango.</p></div>
              <div className="card"><h3>¿Fuera de zona?</h3><p>Envíanos tu ubicación. El repartidor cotiza el costo antes de confirmar.</p><a className="btn primary" href={waLink('Hola Club BASA, quiero cotizar mi envío. Les comparto mi ubicación.')} onClick={() => track('cta_click', { cta: 'envios_cotizar' })}>Cotizar envío</a></div>
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

    {/* CTA sticky móvil: solo tras salir del hero, y solo si el carrito flotante no está ya visible (no compiten por espacio) */}
    {heroPassed && cartLines.length === 0 && <a
      className="stickyOrderCta"
      href={waLink('Hola Club BASA, quiero hacer un pedido.')}
      onClick={() => track('cta_click', { cta: 'sticky_order' })}
    >🛒 Pedir ahora</a>}

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
          style={{ cursor: imageView.zoom > 1 ? (isPanningImage ? 'grabbing' : 'grab') : 'zoom-in' }}
        ><Image
          src={selectedProduct.image}
          alt={selectedProduct.name}
          fill
          sizes="(max-width: 760px) 100vw, 760px"
          priority
          draggable={false}
          style={{ transform: `translate(${imageView.pan.x}px, ${imageView.pan.y}px) scale(${imageView.zoom})`, transition: isPanningImage ? 'none' : 'transform .15s ease-out' }}
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

          {selectedVariantGroup ? <VariantPicker
            product={selectedProduct}
            group={selectedVariantGroup}
            initial={editingVariantLine ? { variantId: editingVariantLine.variantId, qty: editingVariantLine.qty } : undefined}
            onAdd={(option, qty) => {
              if (editingLineId) {
                replaceVariant(editingLineId, selectedProduct.id, option.id, `${selectedProduct.name} - ${option.label}`, resolveVariantPrice(selectedProduct, option), qty);
              } else {
                addVariant(selectedProduct.id, option.id, `${selectedProduct.name} - ${option.label}`, resolveVariantPrice(selectedProduct, option), qty);
              }
              track('add_to_cart', { product: selectedProduct.id, variant: option.id });
              setSelectedProduct(null);
              setEditingLineId(null);
              setCartDrawerOpen(true);
            }}
          /> : <>
            <div className="productModalActions"><button aria-label={`Quitar ${selectedProduct.name}`} onClick={() => addProduct(selectedProduct, -1)}>−</button><span>{quantityFor(selectedProduct.id)}</span><button aria-label={`Agregar ${selectedProduct.name}`} onClick={() => { addProduct(selectedProduct, 1); track('add_to_cart', { product: selectedProduct.id }); }}>+</button></div>
            <button className="btn primary productModalAdd" onClick={() => { addProduct(selectedProduct, 1); track('add_to_cart', { product: selectedProduct.id }); setSelectedProduct(null); setCartDrawerOpen(true); }}>Agregar al carrito</button>
          </>}
        </div>
      </section>
    </div>}

    {openComboId && getCombo(openComboId) && <ComboBuilder
      products={products}
      combo={getCombo(openComboId)!}
      initialSelections={editingComboSelections ?? undefined}
      onClose={() => { setOpenComboId(null); setEditingLineId(null); setEditingComboSelections(null); }}
      onAdd={(selections) => {
        const combo = getCombo(openComboId)!;
        const line = buildComboLine(products, combo, selections);
        if (editingLineId) {
          const originalQty = cartLines.find((l) => l.lineId === editingLineId)?.qty ?? 1;
          replaceCombo(editingLineId, line.comboId, line.name, line.unitPrice, line.components, originalQty);
        } else {
          addCombo(line.comboId, line.name, line.unitPrice, line.components);
        }
        track('add_to_cart', { product: combo.id });
        setOpenComboId(null);
        setEditingLineId(null);
        setEditingComboSelections(null);
        setCartDrawerOpen(true);
      }}
    />}

    <CartDrawer
      lines={cartLines}
      subtotal={subtotal}
      count={cartCount}
      open={cartDrawerOpen}
      onOpenChange={setCartDrawerOpen}
      onIncrement={incrementLine}
      onDecrement={decrementLine}
      onRemove={removeCartLine}
      onDuplicate={duplicateCartLine}
      onEdit={handleEditLine}
      onClear={clearCartLines}
      onCheckout={handleCheckout}
      onViewMenu={openMenu}
    />
  </>;
}
