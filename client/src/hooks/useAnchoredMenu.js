import { useRef, useState } from 'react';

const VIEWPORT_MARGIN = 12;
const MIN_HEIGHT = 200;
const SIDE_GUTTER = 8;

export default function useAnchoredMenu({ width = 224, estimatedHeight = 220 } = {}) {
  const triggerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState(null);

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }

    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - VIEWPORT_MARGIN;

    // Se abre hacia el lado con más espacio, así en ventanas cortas el panel
    // siempre cae donde cabe en vez de recortarse contra el borde.
    const openUpward = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

    const menuWidth = Math.min(width, window.innerWidth - 2 * SIDE_GUTTER);
    const left = Math.max(
      SIDE_GUTTER,
      Math.min(rect.left, window.innerWidth - menuWidth - SIDE_GUTTER)
    );
    // La altura máxima se ajusta al espacio real disponible: el panel nunca se
    // sale de la ventana, y su contenido interno (lista + editor) hace scroll.
    const maxHeight = Math.max(MIN_HEIGHT, openUpward ? spaceAbove : spaceBelow);

    setStyle(
      openUpward
        ? { bottom: window.innerHeight - rect.top + 4, left, width: menuWidth, maxHeight }
        : { top: rect.bottom + 4, left, width: menuWidth, maxHeight }
    );
    setOpen(true);
  }

  function close() {
    setOpen(false);
  }

  return { triggerRef, open, style, toggle, close };
}
