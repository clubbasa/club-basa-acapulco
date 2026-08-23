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
