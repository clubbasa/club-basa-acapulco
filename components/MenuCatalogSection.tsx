'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Reveal from '@/components/Reveal';
import { isInternalCategory, type CatalogCategory, type CatalogProduct } from '@/lib/catalog';
import { getVariantGroup } from '@/lib/variants';
import { hasOptionGroups, type OptionGroup } from '@/lib/options';
import { protectedImageProps } from '@/lib/image-protection';
import { track } from '@/lib/analytics';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://menu.club-basa.com';

export default function MenuCatalogSection({
  open,
  products,
  categories,
  catalogStatus,
  optionGroups,
  imagesLocked,
  quantityFor,
  variantQtyFor,
  configuredQtyFor,
  onOpenProduct,
  onAddProduct,
}: {
  open: boolean;
  products: CatalogProduct[];
  categories: CatalogCategory[];
  catalogStatus: 'loading' | 'firestore' | 'fallback';
  optionGroups: OptionGroup[];
  imagesLocked: boolean;
  quantityFor: (productId: string) => number;
  variantQtyFor: (productId: string) => number;
  configuredQtyFor: (productId: string) => number;
  onOpenProduct: (product: CatalogProduct) => void;
  onAddProduct: (product: CatalogProduct, delta: number) => void;
}) {
  const [activeCategory, setActiveCategory] = useState('Todos');
  const categoryTabsRef = useRef<HTMLDivElement>(null);
  const [showTabsFade, setShowTabsFade] = useState(false);

  const visibleProducts = products
    .filter((p) => p.id !== 'coffee')
    .filter((p) => activeCategory === 'Todos' || p.category === activeCategory);
  // Deduplica por nombre (si Firestore llega a tener dos documentos de categoría con el
  // mismo nombre, el catálogo nunca debe mostrar dos pestañas idénticas ni marcar ambas
  // como activas al mismo tiempo) y oculta cualquier categoría sin productos elegibles
  // para mostrar (evita pestañas "muertas" que siempre quedan vacías al hacer clic).
  const seenNames = new Set<string>();
  const eligibleProducts = products.filter((p) => p.id !== 'coffee');
  const visibleCategories = categories
    .filter((category) => !isInternalCategory(category.id))
    .filter((category) => eligibleProducts.some((p) => p.category === category.name))
    .filter((category) => {
      if (seenNames.has(category.name)) return false;
      seenNames.add(category.name);
      return true;
    });

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

  const shareProduct = async (product: CatalogProduct, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const btn = event.currentTarget;
    btn.classList.add('shareBtnSent');
    setTimeout(() => btn.classList.remove('shareBtnSent'), 700);
    const productUrl = `${siteUrl}/?producto=${product.id}`;
    const shareTitle = `${product.name} — Club BASA Acapulco${product.price ? ` ($${product.price})` : ''}`;
    try {
      if (navigator.share) {
        // Solo title + url: si además se manda `text`, el cuadro nativo de compartir en
        // Windows/Mac mezcla ambos en un solo bloque al elegir "Copiar", dando un
        // resultado confuso en vez de un link limpio.
        await navigator.share({ title: shareTitle, url: productUrl });
      } else {
        const text = `Mira ${product.name} de Club BASA Acapulco${product.price ? ` — $${product.price}` : ''}: ${productUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
      }
    } catch { /* el usuario canceló el cuadro nativo de compartir */ }
    track('share_product', { product: product.id });
  };

  // Catálogo completo — SIN scroll-snap, navegación libre y rápida. Colapsado por defecto: se despliega desde cualquier CTA "Ver menú" del sitio y se repliega solo con el botón de la escena de categorías. La <section id="menu"> se mantiene siempre en el DOM para que el scroll a #menu tenga un destino estable incluso colapsada.
  return <section id="menu" style={open ? undefined : { padding: 0 }}>{open && <Reveal><div className="container"><div className="sectionHead"><h2>Catálogo interactivo</h2><p>Productos y precios administrados desde Firestore. Si Firebase no está disponible, se muestra un catálogo de respaldo.</p></div>
    <div className="categoryTabsWrap"><div className="categoryTabs" ref={categoryTabsRef} role="tablist" aria-label="Categorías del menú"><button className={activeCategory === 'Todos' ? 'active' : ''} onClick={() => setActiveCategory('Todos')}>Todos</button>{visibleCategories.map((category) => <button key={category.id} className={activeCategory === category.name ? 'active' : ''} onClick={() => setActiveCategory(category.name)}>{category.name}</button>)}</div>{showTabsFade && <div className="categoryTabsFade" aria-hidden="true">›</div>}</div>
    <div className="catalogStatus">{catalogStatus === 'firestore' ? '● Catálogo actualizado' : catalogStatus === 'loading' ? 'Cargando catálogo…' : '● Mostrando catálogo de respaldo'}</div>
    <div className="menuGrid">{visibleProducts.map((product) => <article className="menuCard" key={product.id} role="button" tabIndex={0} aria-label={`Ver detalles de ${product.name}`} onClick={() => onOpenProduct(product)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpenProduct(product); } }}>
      {product.image ? <div className="menuImage" onClick={(event) => { event.stopPropagation(); onOpenProduct(product); }}><Image src={product.image} alt={product.name} fill sizes="(max-width: 560px) 100vw, 33vw" {...protectedImageProps(imagesLocked)}/><button type="button" className="shareBtn" aria-label={`Compartir ${product.name}`} onClick={(event) => shareProduct(product, event)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button></div> : <div className="menuImage menuImageEmpty"><span aria-hidden="true">Sin imagen</span><button type="button" className="shareBtn" aria-label={`Compartir ${product.name}`} onClick={(event) => shareProduct(product, event)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button></div>}
      <div className="menuTop"><strong>{product.name}</strong>{!isInternalCategory(product.category) && <span className="tag">{product.category}</span>}</div><p>{product.description}</p>{product.availability && <span className="small">{product.availability}</span>}<div className="menuPrice">{product.price ? `$${product.price}` : 'Consultar'}</div>{hasOptionGroups(product.id, optionGroups) ? <button type="button" className="btn primary menuCardVariantCta" onClick={(event) => { event.stopPropagation(); onOpenProduct(product); }}>{configuredQtyFor(product.id) > 0 ? `${configuredQtyFor(product.id)} en tu pedido — Elegir` : 'Elegir opciones'}</button> : getVariantGroup(product.id) ? <button type="button" className="btn primary menuCardVariantCta" onClick={(event) => { event.stopPropagation(); onOpenProduct(product); }}>{variantQtyFor(product.id) > 0 ? `${variantQtyFor(product.id)} en tu pedido — Elegir` : 'Elegir opciones'}</button> : <div className="qty"><button aria-label={`Quitar ${product.name}`} onClick={(event) => { event.stopPropagation(); onAddProduct(product, -1); }}>−</button><span>{quantityFor(product.id)}</span><button aria-label={`Agregar ${product.name}`} onClick={(event) => { event.stopPropagation(); onAddProduct(product, 1); track('add_to_cart', { product: product.id }); }}>+</button></div>}
    </article>)}</div>
  </div></Reveal>}</section>;
}
