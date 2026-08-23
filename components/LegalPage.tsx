type LegalId = 'privacidad' | 'terminos' | 'cambios';

const LEGAL_LINKS: { id: LegalId; href: string; label: string }[] = [
  { id: 'privacidad', href: '/aviso-de-privacidad', label: 'Aviso de Privacidad' },
  { id: 'terminos', href: '/terminos-y-condiciones', label: 'Términos y Condiciones' },
  { id: 'cambios', href: '/politica-cambios-cancelaciones', label: 'Cambios, Cancelaciones y Devoluciones' },
];

type Props = {
  currentId: LegalId;
  title: string;
  updated: string;
  intro: string;
  children: React.ReactNode;
};

export default function LegalPage({ currentId, title, updated, intro, children }: Props) {
  return (
    <main className="container" style={{ padding: '70px 0 90px' }}>
      <span className="eyebrow">Club BASA Acapulco</span>
      <h1 style={{ fontSize: 'clamp(38px,6vw,56px)', margin: '18px 0 6px' }}>{title}</h1>
      <p className="small">Última actualización: {updated}</p>
      <p className="legalIntro">{intro}</p>

      <div className="legalBody">{children}</div>

      <nav className="legalCrossLinks" aria-label="Otros documentos legales">
        <p className="small" style={{ marginBottom: 10 }}>Consulta también:</p>
        <div className="footerLinks">
          {LEGAL_LINKS.filter((link) => link.id !== currentId).map((link) => <a key={link.href} href={link.href}>{link.label}</a>)}
          <a href="/#contacto">Contacto</a>
        </div>
      </nav>

      <p style={{ marginTop: 30 }}><a href="/">← Volver al catálogo</a></p>
    </main>
  );
}
