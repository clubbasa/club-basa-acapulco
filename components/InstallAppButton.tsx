'use client';

import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export default function InstallAppButton() {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);
    // Safari en iOS no dispara beforeinstallprompt ni soporta instalación
    // programática — solo se puede instalar manualmente desde el menú Compartir.
    setIsIos(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => { setDeferredEvent(null); setIsStandalone(true); };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (isStandalone) return null;
  if (!deferredEvent && !isIos) return null;

  const handleClick = async () => {
    if (deferredEvent) {
      await deferredEvent.prompt();
      // El evento del navegador solo se puede usar una vez, se acepte o no.
      await deferredEvent.userChoice;
      setDeferredEvent(null);
      return;
    }
    setShowIosHint((open) => !open);
  };

  return (
    <span className="installAppWrap">
      <button type="button" className="social" onClick={handleClick}>📲 Instalar app</button>
      {showIosHint && (
        <p className="installIosHint" role="status">
          Toca <strong>Compartir</strong> (el ícono ⬆️ de Safari) y luego <strong>&quot;Agregar a pantalla de inicio&quot;</strong>.
        </p>
      )}
    </span>
  );
}
