'use client';

import Image from 'next/image';
import ScrollScene from '@/components/ScrollScene';
import type { CatalogProduct } from '@/lib/catalog';
import { track } from '@/lib/analytics';
import { protectedImageProps } from '@/lib/image-protection';

export default function FeaturedScenes({
  products,
  imagesLocked,
  menuOpen,
  onOpenProduct,
  onOpenCombo,
  onToggleMenuOpen,
}: {
  products: CatalogProduct[];
  imagesLocked: boolean;
  menuOpen: boolean;
  onOpenProduct: (product: CatalogProduct) => void;
  onOpenCombo: (comboId: string) => void;
  onToggleMenuOpen: () => void;
}) {
  const sixProduct = products.find((p) => p.id === 'six');
  const shakeProduct = products.find((p) => p.id === 'shake');
  const specialProduct = products.find((p) => p.id === 'special');
  const waffleProduct = products.find((p) => p.id === 'waffle');
  const crepaProduct = products.find((p) => p.id === 'crepa');
  const teaProduct = products.find((p) => p.id === 'tea');
  const aloeProduct = products.find((p) => p.id === 'aloe');

  return <>
    {/* Escena 2 — Producto estrella: Producto → Beneficio → Oferta → CTA */}
    <ScrollScene id="producto-estrella">
      <div className="container">
        <div className="sceneGrid">
          <div className="sceneMedia" style={{ aspectRatio: '4 / 5' }}>
            {sixProduct?.image ? <Image src={sixProduct.image} alt="Six de panquecitos Club BASA" fill sizes="(max-width: 850px) 100vw, 50vw" {...protectedImageProps(imagesLocked)} /> : <div className="menuImageEmpty" style={{ position: 'absolute', inset: 0 }}>Sin imagen</div>}
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
            <button type="button" className="btn primary" onClick={() => { track('cta_click', { cta: 'six_order' }); sixProduct && onOpenProduct(sixProduct); }}>Quiero mi six</button>
          </div>
        </div>
      </div>
    </ScrollScene>

    {/* Escena 3 — Arma tu desayuno: cross-sell de bebidas reales complementarias al six (no repite al six como protagonista). La oferta de bienvenida (café de regalo) se conserva como incentivo secundario, no como segunda venta. */}
    <ScrollScene id="desayuno">
      <div className="container">
        <div className="sectionHead"><h2>Arma tu desayuno</h2><p>Completa tu six con una bebida preparada al momento.</p></div>
        <div className="grid3">
          <div className="card cardClickable" role="button" tabIndex={0} aria-label="Armar mi desayuno con malteada" onClick={() => { track('cta_click', { cta: 'breakfast_order' }); onOpenCombo('arma-tu-desayuno'); }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); track('cta_click', { cta: 'breakfast_order' }); onOpenCombo('arma-tu-desayuno'); } }}>
            {shakeProduct?.image && <div className="sceneMedia" style={{ aspectRatio: '1 / 1', marginBottom: 14 }}><Image src={shakeProduct.image} alt="Malteada Club BASA" fill sizes="(max-width: 850px) 100vw, 33vw" {...protectedImageProps(imagesLocked)} /></div>}
            <h3>Malteada</h3><p>{shakeProduct?.price ? `$${shakeProduct.price}` : 'Consultar'}</p>
          </div>
          <div className="card cardClickable" role="button" tabIndex={0} aria-label="Armar mi desayuno con té" onClick={() => { track('cta_click', { cta: 'breakfast_order' }); onOpenCombo('arma-tu-desayuno'); }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); track('cta_click', { cta: 'breakfast_order' }); onOpenCombo('arma-tu-desayuno'); } }}>
            {teaProduct?.image && <div className="sceneMedia" style={{ aspectRatio: '1 / 1', marginBottom: 14 }}><Image src={teaProduct.image} alt="Té Club BASA" fill sizes="(max-width: 850px) 100vw, 33vw" {...protectedImageProps(imagesLocked)} /></div>}
            <h3>Té</h3><p>{teaProduct?.price ? `$${teaProduct.price}` : 'Consultar'}</p>
          </div>
          <div className="card cardClickable" role="button" tabIndex={0} aria-label="Armar mi desayuno con aloe" onClick={() => { track('cta_click', { cta: 'breakfast_order' }); onOpenCombo('arma-tu-desayuno'); }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); track('cta_click', { cta: 'breakfast_order' }); onOpenCombo('arma-tu-desayuno'); } }}>
            {aloeProduct?.image && <div className="sceneMedia" style={{ aspectRatio: '1 / 1', marginBottom: 14 }}><Image src={aloeProduct.image} alt="Aloe Club BASA" fill sizes="(max-width: 850px) 100vw, 33vw" {...protectedImageProps(imagesLocked)} /></div>}
            <h3>Aloe</h3><p>{aloeProduct?.price ? `$${aloeProduct.price}` : 'Consultar'}</p>
          </div>
        </div>
        <p className="small" style={{ marginTop: 22, color: 'var(--muted)' }}>Además, en tu primera compra del six te regalamos café de grano arábica.</p>
        <div style={{ marginTop: 20, textAlign: 'center' }}><button type="button" className="btn primary" onClick={() => { track('cta_click', { cta: 'breakfast_order' }); onOpenCombo('arma-tu-desayuno'); }}>Armar mi desayuno</button></div>
      </div>
    </ScrollScene>

    {/* Escena 4 — Descubrir el menú: mapa de categorías reales para aumentar ticket promedio, no el catálogo completo. Se quita panquecitos de esta grilla (ya fue protagonista en la Escena 2) y se usa una grilla de 4 columnas, más densa que la de 3 de la Escena 3, para que no se sienta igual escena tras escena. */}
    <ScrollScene id="categorias">
      <div className="container">
        <div className="sectionHead"><h2>Y hay mucho más para pedir</h2><p>Malteadas, waffles, crepas y especialidades.</p></div>
        <div className="grid4">
          <div className="card">
            {shakeProduct?.image && <div className="sceneMedia" style={{ aspectRatio: '1 / 1', marginBottom: 14 }}><Image src={shakeProduct.image} alt="Malteada Club BASA" fill sizes="(max-width: 850px) 100vw, 25vw" {...protectedImageProps(imagesLocked)} /></div>}
            <h3>Malteadas</h3><p>{shakeProduct?.price ? `$${shakeProduct.price}` : 'Consultar'}</p>
          </div>
          <div className="card">
            {waffleProduct?.image && <div className="sceneMedia" style={{ aspectRatio: '1 / 1', marginBottom: 14 }}><Image src={waffleProduct.image} alt="Waffle Club BASA" fill sizes="(max-width: 850px) 100vw, 25vw" {...protectedImageProps(imagesLocked)} /></div>}
            <h3>Waffles</h3><p>{waffleProduct?.price ? `$${waffleProduct.price}` : 'Consultar'}</p>
          </div>
          <div className="card">
            {crepaProduct?.image && <div className="sceneMedia" style={{ aspectRatio: '1 / 1', marginBottom: 14 }}><Image src={crepaProduct.image} alt="Crepa Club BASA" fill sizes="(max-width: 850px) 100vw, 25vw" {...protectedImageProps(imagesLocked)} /></div>}
            <h3>Crepas</h3><p>{crepaProduct?.price ? `$${crepaProduct.price}` : 'Consultar'}</p>
          </div>
          <div className="card">
            {specialProduct?.image ? <div className="sceneMedia" style={{ aspectRatio: '1 / 1', marginBottom: 14 }}><Image src={specialProduct.image} alt="Especialidades Club BASA" fill sizes="(max-width: 850px) 100vw, 25vw" {...protectedImageProps(imagesLocked)} /></div> : <div className="icon">🌯</div>}
            <h3>Especialidades</h3><p>Rollitos salados y más, sobre pedido.</p>
          </div>
        </div>
        <div style={{ marginTop: 32, textAlign: 'center' }}><button type="button" className="btn primary" aria-expanded={menuOpen} aria-controls="menu" onClick={() => { track('cta_click', { cta: 'menu_explore' }); onToggleMenuOpen(); }}>{menuOpen ? 'Ocultar menú' : 'Ver todo el menú'}</button></div>
      </div>
    </ScrollScene>
  </>;
}
