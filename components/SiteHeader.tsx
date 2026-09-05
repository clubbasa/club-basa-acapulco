'use client';

import { useEffect } from 'react';
import { waLink } from '@/lib/whatsapp';
import { track } from '@/lib/analytics';

export default function SiteHeader({
  theme,
  onToggleTheme,
  mobileMenuOpen,
  onToggleMobileMenu,
  onVipClick,
  onOpenMenu,
}: {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  mobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
  onVipClick: () => void;
  onOpenMenu: () => void;
}) {
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onToggleMobileMenu();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobileMenuOpen]);

  const navLinks = <>
    <a href="#menu" onClick={(event) => { event.preventDefault(); onOpenMenu(); }}>Menú</a>
    <a href="#beneficios">Beneficios</a>
    <a href="#envios">Envíos</a>
    <a href="#encuentranos">Encuéntranos</a>
    <a href="#faq">FAQ</a>
    <a href="/blog">Blog</a>
    <a href="#contacto">Contacto</a>
    <a href="/mi-cuenta">Mi cuenta</a>
    <a href="/registro" className="navVip" onClick={(event) => { event.preventDefault(); onVipClick(); }}>★ Promoción VIP</a>
  </>;

  return <header className="nav"><div className="container navin">
    <a
      className="logo"
      href="#inicio"
      aria-label="Club BASA Acapulco. Volver al inicio."
    ><span className="logoBlack">CLUB</span><span>BASA</span><small>ACAPULCO</small></a>
    <nav className="navlinks">{navLinks}</nav>
    <a className="navcta" href={waLink('Hola Club BASA, quiero hacer un pedido.')} onClick={() => track('cta_click', { cta: 'header_order' })}>◔ &nbsp;Pedir por WhatsApp</a>
    <button type="button" className="themeToggle" aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'} onClick={onToggleTheme}>
      {theme === 'dark'
        ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
        : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.5A8.5 8.5 0 1 1 11.5 3a7 7 0 0 0 9.5 9.5z"/></svg>}
    </button>
    <button type="button" className="navToggle" aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={mobileMenuOpen} aria-controls="mobile-menu" onClick={onToggleMobileMenu}>{mobileMenuOpen ? '✕' : '☰'}</button>
  </div>
  {mobileMenuOpen && <nav id="mobile-menu" className="mobileMenu" aria-label="Menú móvil" onClick={onToggleMobileMenu}>
    {navLinks}
  </nav>}
  </header>;
}
