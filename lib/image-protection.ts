import type { CSSProperties, SyntheticEvent } from 'react';

// Deterrente, no un bloqueo real: evita el clic derecho "Guardar imagen" y el
// guardado táctil en iOS, pero cualquiera puede seguir tomando una captura de
// pantalla. No hay forma de impedir eso desde el navegador.
export const IMAGE_LOCK_STYLE: CSSProperties = { WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' };

export function protectedImageProps(locked: boolean) {
  if (!locked) return {};
  return {
    draggable: false as const,
    onContextMenu: (event: SyntheticEvent) => event.preventDefault(),
    style: IMAGE_LOCK_STYLE,
  };
}
