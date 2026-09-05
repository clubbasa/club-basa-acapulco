'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
// Se importa desde firebase-auth (no firebase.ts) para no inicializar Firestore aquí —
// mismo patrón aislado que ya usa app/login/page.tsx.
import { auth } from '@/lib/firebase-auth';
import { getCatalog, getFallbackCategories, getFallbackProducts, type CatalogProduct } from '@/lib/catalog';
import { buildOrder, waLink } from '@/lib/whatsapp';
import { track } from '@/lib/analytics';
import { useCart } from '@/hooks/useCart';
import { useImageLock } from '@/hooks/useImageLock';
import { resolveVariantPrice } from '@/lib/variants';
import { getCombo, buildComboLine, type ComboSelections } from '@/lib/combos';
import { createOrderRequest, getCustomerContact } from '@/lib/orders';
import { getOptionGroups, getProductOptions, type OptionGroup, type ProductOption } from '@/lib/options';
import type { CartLine, VariantCartLine, ConfiguredCartLine } from '@/lib/cart';
import ComboBuilder from '@/components/ComboBuilder';
import CartDrawer from '@/components/CartDrawer';
import Footer from '@/components/Footer';
import SiteHeader from '@/components/SiteHeader';
import HeroSection from '@/components/HeroSection';
import FeaturedScenes from '@/components/FeaturedScenes';
import MenuCatalogSection from '@/components/MenuCatalogSection';
import ClosingScenes from '@/components/ClosingScenes';
import ProductModal from '@/components/ProductModal';

export default function Home() {
  const [products, setProducts] = useState<CatalogProduct[]>(getFallbackProducts());
  const [categories, setCategories] = useState(getFallbackCategories());
  const [catalogStatus, setCatalogStatus] = useState<'loading' | 'firestore' | 'fallback'>('loading');
  const {
    lines: cartLines, subtotal, count: cartCount,
    addSimple, addVariant, addCombo, addConfigured, setQty: setCartQty,
    remove: removeCartLine, clear: clearCartLines, duplicate: duplicateCartLine,
    replaceVariant, replaceCombo, replaceConfigured,
  } = useCart(products);
  const imagesLocked = useImageLock();
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [openComboId, setOpenComboId] = useState<string | null>(null);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editingComboSelections, setEditingComboSelections] = useState<ComboSelections | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [heroPassed, setHeroPassed] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [user, setUser] = useState<User | null>(null);
  const [profileContact, setProfileContact] = useState<{ name?: string; whatsapp?: string }>({});
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('clubbasa-theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(stored === 'dark' || stored === 'light' ? stored : (systemDark ? 'dark' : 'light'));
  }, []);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!user) { setProfileContact({}); return; }
    let mounted = true;
    getCustomerContact(user.uid).then((contact) => { if (mounted) setProfileContact(contact); }).catch((error) => console.error(error));
    return () => { mounted = false; };
  }, [user]);

  const handleVipPromoClick = () => {
    track('cta_click', { cta: 'vip_promo' });
    window.location.href = user ? '/mi-cuenta' : '/registro';
  };

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

  // Deep-link desde un producto compartido: ?producto=<id> abre su ficha directamente.
  // Reintenta en cada actualización de `products` porque el catálogo real de Firestore
  // llega después del fallback estático y puede ser el único que tenga ese producto.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('producto');
    if (!productId) return;
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setSelectedProduct(product);
    track('view_product', { product: product.id });
    const url = new URL(window.location.href);
    url.searchParams.delete('producto');
    window.history.replaceState({}, '', url.toString());
  }, [products]);

  useEffect(() => {
    let mounted = true;
    // Igual que el catálogo: un fallo aquí no debe romper la página — los productos
    // simplemente se muestran sin opciones configurables hasta que se pueda leer.
    Promise.all([getOptionGroups(), getProductOptions()])
      .then(([groups, options]) => {
        if (!mounted) return;
        setOptionGroups(groups);
        setProductOptions(options);
      })
      .catch((error) => console.warn('No se pudieron cargar los grupos de opciones.', error));
    return () => { mounted = false; };
  }, []);

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
    if (!selectedProduct) setEditingLineId(null);
  }, [selectedProduct]);

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

  const quantityFor = (productId: string) => cartLines.find((line) => line.kind === 'simple' && line.productId === productId)?.qty || 0;
  const variantQtyFor = (productId: string) => cartLines.filter((line) => line.kind === 'variant' && line.productId === productId).reduce((sum, line) => sum + line.qty, 0);
  const configuredQtyFor = (productId: string) => cartLines.filter((line) => line.kind === 'configured' && line.productId === productId).reduce((sum, line) => sum + line.qty, 0);
  const groupsForProduct = (productId: string) => optionGroups.filter((group) => group.productId === productId && group.active !== false).sort((a, b) => a.sortOrder - b.sortOrder);
  const optionsForProduct = (productId: string) => productOptions.filter((option) => option.productId === productId && option.active !== false);
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
    const message = buildOrder(cartLines);
    const contact = user
      ? { name: profileContact.name, phone: profileContact.whatsapp }
      : { name: guestName.trim() || undefined, phone: guestPhone.trim() || undefined };
    // Registro del pedido en Firestore para historial/trazabilidad: es aditivo y
    // nunca debe bloquear ni retrasar la redirección a WhatsApp, que sigue siendo
    // el mecanismo real de confirmación del pedido.
    (user ? user.getIdToken() : Promise.resolve(undefined))
      .then((token) => createOrderRequest(cartLines, contact, message, token))
      .catch((error) => console.error('No se pudo registrar el pedido en el historial.', error));
    window.location.href = waLink(message);
  };
  const handleEditLine = (line: CartLine) => {
    if (line.kind === 'variant' || line.kind === 'configured') {
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
      const selections: ComboSelections = {};
      line.components.forEach((component) => {
        const slotItems = selections[component.slotId] ?? [];
        selections[component.slotId] = [...slotItems, {
          productId: component.productId,
          name: component.name,
          price: component.price,
          qty: component.qty,
          configuration: component.configuration,
        }];
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
  const toggleMenuSection = () => {
    if (menuOpen) setMenuOpen(false);
    else openMenu();
  };

  const editingVariantLine = editingLineId ? cartLines.find((line): line is VariantCartLine => line.lineId === editingLineId && line.kind === 'variant') : undefined;
  const editingConfiguredLine = editingLineId ? cartLines.find((line): line is ConfiguredCartLine => line.lineId === editingLineId && line.kind === 'configured') : undefined;

  return <>
    <SiteHeader
      theme={theme}
      onToggleTheme={toggleTheme}
      mobileMenuOpen={mobileMenuOpen}
      onToggleMobileMenu={() => setMobileMenuOpen((open) => !open)}
      onVipClick={handleVipPromoClick}
      onOpenMenu={openMenu}
    />

    <main id="inicio">
      <HeroSection products={products} imagesLocked={imagesLocked} onOpenMenu={openMenu} />

      <FeaturedScenes
        products={products}
        imagesLocked={imagesLocked}
        menuOpen={menuOpen}
        onOpenProduct={openProduct}
        onOpenCombo={setOpenComboId}
        onToggleMenuOpen={toggleMenuSection}
      />

      <MenuCatalogSection
        open={menuOpen}
        products={products}
        categories={categories}
        catalogStatus={catalogStatus}
        optionGroups={optionGroups}
        imagesLocked={imagesLocked}
        quantityFor={quantityFor}
        variantQtyFor={variantQtyFor}
        configuredQtyFor={configuredQtyFor}
        onOpenProduct={openProduct}
        onAddProduct={addProduct}
      />

      <ClosingScenes products={products} imagesLocked={imagesLocked} onOpenMenu={openMenu} />
    </main>

    <Footer/>

    {/* CTA sticky móvil: solo tras salir del hero, y solo si el carrito flotante no está ya visible (no compiten por espacio) */}
    {heroPassed && cartLines.length === 0 && <a
      className="stickyOrderCta"
      href={waLink('Hola Club BASA, quiero hacer un pedido.')}
      onClick={() => track('cta_click', { cta: 'sticky_order' })}
    >🛒 Pedir ahora</a>}

    {selectedProduct && <ProductModal
      product={selectedProduct}
      imagesLocked={imagesLocked}
      groups={groupsForProduct(selectedProduct.id)}
      options={optionsForProduct(selectedProduct.id)}
      quantity={quantityFor(selectedProduct.id)}
      editingVariantLine={editingVariantLine}
      editingConfiguredLine={editingConfiguredLine}
      onClose={() => setSelectedProduct(null)}
      onQuantityChange={(delta) => {
        addProduct(selectedProduct, delta);
        if (delta > 0) track('add_to_cart', { product: selectedProduct.id });
      }}
      onAddConfigured={(configuration, unitPrice, qty) => {
        if (editingLineId) {
          replaceConfigured(editingLineId, selectedProduct.id, selectedProduct.name, unitPrice, configuration, selectedProduct.sku, qty);
        } else {
          addConfigured(selectedProduct.id, selectedProduct.name, unitPrice, configuration, selectedProduct.sku, qty);
        }
        track('add_to_cart', { product: selectedProduct.id });
        setSelectedProduct(null);
        setEditingLineId(null);
        setCartDrawerOpen(true);
      }}
      onAddVariant={(option, qty) => {
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
      onAddSimple={() => {
        addProduct(selectedProduct, 1);
        track('add_to_cart', { product: selectedProduct.id });
        setSelectedProduct(null);
        setCartDrawerOpen(true);
      }}
    />}

    {openComboId && getCombo(openComboId) && <ComboBuilder
      products={products}
      combo={getCombo(openComboId)!}
      optionGroups={optionGroups}
      productOptions={productOptions}
      hasSix={quantityFor('six') > 0}
      initialSelections={editingComboSelections ?? undefined}
      onClose={() => { setOpenComboId(null); setEditingLineId(null); setEditingComboSelections(null); }}
      onAdd={(selections) => {
        const combo = getCombo(openComboId)!;
        const line = buildComboLine(combo, selections);
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
      showGuestFields={!user}
      guestName={guestName}
      guestPhone={guestPhone}
      onGuestNameChange={setGuestName}
      onGuestPhoneChange={setGuestPhone}
    />
  </>;
}
