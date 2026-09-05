'use client';

import Image from 'next/image';
import ScrollScene from '@/components/ScrollScene';
import ContactForm from '@/components/ContactForm';
import InstallAppButton from '@/components/InstallAppButton';
import type { CatalogProduct } from '@/lib/catalog';
import { waLink } from '@/lib/whatsapp';
import { track } from '@/lib/analytics';
import { protectedImageProps } from '@/lib/image-protection';

const heroImage = 'https://res.cloudinary.com/m71breje/image/upload/v1786171381/panquecitos_sin_logo_i59l6l.jpg';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://menu.club-basa.com';

export default function ClosingScenes({ products, imagesLocked, onOpenMenu }: {
  products: CatalogProduct[];
  imagesLocked: boolean;
  onOpenMenu: () => void;
}) {
  const menuPosterProduct = products.find((p) => p.id === 'menu');
  const specialProduct = products.find((p) => p.id === 'special');
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(`Mira el menú de Club BASA Acapulco: ${siteUrl}`)}`;

  const share = async () => {
    // Solo title + url: si además se manda `text`, el cuadro nativo de compartir en
    // Windows/Mac mezcla ambos en un solo bloque al elegir "Copiar", dando un
    // resultado confuso en vez de un link limpio.
    if (navigator.share) await navigator.share({ title: 'Club BASA Acapulco', url: window.location.href });
    else await navigator.clipboard.writeText(window.location.href);
    track('share_landing');
  };

  return <>
    {/* Escena 5 — Experiencia Club BASA: solo fotos reales, sin testimonios inventados */}
    <ScrollScene id="experiencia">
      <div className="container">
        <div className="sectionHead"><h2>La experiencia Club BASA</h2><p>Sabor, cercanía y confianza en cada pedido.</p></div>
        <div className="grid3">
          {menuPosterProduct?.image && <div className="sceneMedia" style={{ aspectRatio: '3 / 4' }}><Image src={menuPosterProduct.image} alt="Menú saludable Club BASA" fill sizes="(max-width: 850px) 100vw, 33vw" {...protectedImageProps(imagesLocked)} /></div>}
          <div className="sceneMedia" style={{ aspectRatio: '3 / 4' }}><Image src={heroImage} alt="Panquecitos Club BASA" fill sizes="(max-width: 850px) 100vw, 33vw" {...protectedImageProps(imagesLocked)} /></div>
          {specialProduct?.image && <div className="sceneMedia" style={{ aspectRatio: '3 / 4' }}><Image src={specialProduct.image} alt={specialProduct.name} fill sizes="(max-width: 850px) 100vw, 33vw" {...protectedImageProps(imagesLocked)} /></div>}
        </div>
        <div className="sceneSub" style={{ display: 'flex', flexWrap: 'wrap', gap: 32, justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="sectionHead"><h2>Comparte Club BASA</h2><p>Envíale la página a quien siempre pregunta “¿dónde compraste eso?”</p></div>
            <div className="socials"><button className="social" onClick={share}>📤 Compartir</button><a className="social" href={whatsappShareUrl}>WhatsApp</a><a className="social" href="https://www.facebook.com/sharer/sharer.php" target="_blank" rel="noreferrer">Facebook</a><a className="social" href="https://twitter.com/intent/tweet" target="_blank" rel="noreferrer">X</a><InstallAppButton/></div>
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
          <a className="btn secondary" href="#menu" onClick={(event) => { event.preventDefault(); track('cta_click', { cta: 'final_menu' }); onOpenMenu(); }}>Ver menú</a>
        </div>

        <div id="envios" className="sceneSub">
          <div className="sectionHead"><h2>Envío a domicilio en Acapulco</h2><p>El reparto lo realiza un servicio externo a Club BASA. Para cotizar con precisión, necesitamos tu ubicación de Google Maps o WhatsApp.</p></div>
          <div className="grid3">
            <div className="card"><h3>$60 aprox.</h3><p>Zona cercana a La Garita, incluyendo referencias como VIPS de La Diana, Costera 125, Roble, Anclas y Laja.</p></div>
            <div className="card"><h3>$80 aprox.</h3><p>Progreso, zona Centro, Zócalo, Costa Azul y zonas dentro de ese rango.</p></div>
            <div className="card"><h3>¿Fuera de zona?</h3><p>Envíanos tu ubicación. El repartidor cotiza el costo antes de confirmar.</p><a className="btn primary" href={waLink('Hola Club BASA, quiero cotizar mi envío. Les comparto mi ubicación.')} onClick={() => track('cta_click', { cta: 'envios_cotizar' })}>Cotizar envío</a></div>
          </div>
        </div>

        <div id="encuentranos" className="sceneSub">
          <div className="sectionHead"><h2>Encuéntranos</h2><p>Visítanos en nuestro local en Acapulco o escríbenos directo.</p></div>
          <div className="grid3">
            <div className="card">
              <h3>Nuestra dirección</h3>
              <p>Av. Cuauhtémoc, Col. Garita, Acapulco, Guerrero, México, C.P. 39650.</p>
              <p className="small">Frente a la iglesia, a un lado del OXXO, fachada color verde.</p>
              <a className="btn primary" href="https://g.page/clubbasa" target="_blank" rel="noreferrer" onClick={() => track('cta_click', { cta: 'como_llegar' })}>Cómo llegar</a>
            </div>
            <div className="card">
              <h3>WhatsApp</h3>
              <p>Escríbenos para pedidos, dudas o cotizar tu envío.</p>
              <a className="btn secondary" href={waLink('Hola Club BASA, quiero más información.')} target="_blank" rel="noreferrer">744 588 7237</a>
            </div>
            <div className="card">
              <h3>Correo</h3>
              <p>Para dudas o solicitudes que prefieras dejar por escrito.</p>
              <a className="btn secondary" href="mailto:info@club-basa.com">info@club-basa.com</a>
            </div>
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
  </>;
}
