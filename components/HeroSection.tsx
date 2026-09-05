'use client';

import Image from 'next/image';
import type { CatalogProduct } from '@/lib/catalog';
import { waLink } from '@/lib/whatsapp';
import { track } from '@/lib/analytics';
import { protectedImageProps } from '@/lib/image-protection';

const heroImage = 'https://res.cloudinary.com/m71breje/image/upload/v1786171381/panquecitos_sin_logo_i59l6l.jpg';

export default function HeroSection({ products, imagesLocked, onOpenMenu }: {
  products: CatalogProduct[];
  imagesLocked: boolean;
  onOpenMenu: () => void;
}) {
  const sixProduct = products.find((p) => p.id === 'six');

  return (
    /* Escena 1 — Hero: se mantiene la implementación full-bleed original (ya tenía min-height:100vh y fade-in propio), solo se agrega scroll-snap y se reordenan los CTA por prioridad de conversión. */
    <section id="hero" className="hero heroFull"><Image className="heroImage" src={heroImage} alt="Six de panquecitos Club BASA Acapulco" fill priority sizes="100vw" quality={82} {...protectedImageProps(imagesLocked)}/><div className="heroShade" aria-hidden="true"/><div className="container heroContent"><div className="heroCopy reveal">
      <span className="eyebrow heroEyebrow">Club BASA Acapulco</span><h1>Sabor que<br/>enamora.<br/>Nutrición que<br/><em>acompaña.</em></h1>
      <p>Malteadas, panquecitos, crepas, waffles y opciones para disfrutar tu desayuno, con la nutrición Herbalife que ya conoces.</p>
      <div className="actions"><a className="btn primary heroCtaPulse" href={waLink('Hola Club BASA, quiero hacer un pedido.')} onClick={() => track('cta_click', { cta: 'hero_order' })}><span className="heroCtaIcon" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12c0 1.9.5 3.7 1.5 5.3L2 22l4.9-1.3c1.5.8 3.2 1.3 5.1 1.3 5.5 0 10-4.5 10-10S17.5 2 12 2zm5.6 14.2c-.2.6-1.2 1.2-1.7 1.3-.4.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.5-2.6-1.1-4.3-3.8-4.4-4-.1-.2-1-1.3-1-2.5s.6-1.8.9-2c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.4.2.5.7 1.8.8 1.9.1.2.1.4 0 .6-.1.2-.2.3-.3.5-.2.2-.3.3-.5.5-.2.2-.3.4-.1.7.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.5 1.6.3.1.5.1.6-.1.2-.2.7-.8.9-1.1.2-.3.4-.2.6-.1.2.1 1.5.7 1.7.8.2.1.4.2.4.3.1.2.1.7-.1 1.3z"/></svg></span>Pedir ahora</a><a className="btn secondary heroSecondary" href="#menu" onClick={(event) => { event.preventDefault(); track('cta_click', { cta: 'hero_menu' }); onOpenMenu(); }}>Ver menú</a></div>
      <p className="heroCtaNote"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9"/></svg>Confirmamos tu pedido por WhatsApp en minutos</p>
      <div className="heroTrust"><span>◯ <b>Recetas sin</b><small>harinas ni aceite</small></span><span>◉ <b>Altos en</b><small>proteína</small></span><span>♡ <b>Hechos con</b><small>nutrición Herbalife</small></span></div>
    </div></div>
    <div className="heroOffer container"><div className="offerItem"><div className="offerIcon">☕</div><div><strong>Primera compra de six</strong><p>Incluye recipiente + papel grado alimenticio<br/>y café de grano arábica de regalo.</p></div></div><div className="offerItem offerPrice"><div className="offerIcon">▣</div><div><strong>Six de panquecitos</strong><b>{sixProduct?.price ? `$${sixProduct.price}` : 'Consultar'}</b></div></div><div className="offerItem"><div className="offerIcon">🛵</div><div><strong>Envío a domicilio</strong><p>Zona cercana $60 • Zona ampliada $80<br/>Fuera de zona: cotización personalizada.</p></div></div></div></section>
  );
}
