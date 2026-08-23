import { WA } from '@/lib/whatsapp';

const LEGAL_LINKS = [
  { href: '/aviso-de-privacidad', label: 'Aviso de Privacidad' },
  { href: '/terminos-y-condiciones', label: 'Términos y Condiciones' },
  { href: '/politica-cambios-cancelaciones', label: 'Cambios, Cancelaciones y Devoluciones' },
];

export default function Footer() {
  return (
    <footer>
      <div className="container">
        <div className="footerRow">
          <div className="footerBrand">
            <strong>Club BASA Acapulco</strong>
            <p>Panquecitos, waffles, crepas y malteadas. Pedidos por WhatsApp.</p>
          </div>
          <div className="footerContact">
            <strong>Encuéntranos</strong>
            <p>Av. Cuauhtémoc, Col. Garita, Acapulco, Guerrero, C.P. 39650</p>
            <p><a href="https://g.page/clubbasa" target="_blank" rel="noreferrer">Cómo llegar →</a></p>
            <p><a href={`https://wa.me/${WA}`} target="_blank" rel="noreferrer">744 588 7237</a> · <a href="mailto:info@club-basa.com">info@club-basa.com</a></p>
          </div>
          <nav className="footerLinks" aria-label="Legal y contacto">
            {LEGAL_LINKS.map((link) => <a key={link.href} href={link.href}>{link.label}</a>)}
            <a href="/#contacto">Contacto</a>
          </nav>
        </div>
        <p className="footerCopy">© {new Date().getFullYear()} Club BASA Acapulco. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
