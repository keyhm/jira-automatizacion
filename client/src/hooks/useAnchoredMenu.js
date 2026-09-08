import { useRef, useState } from 'react';

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
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < estimatedHeight && rect.top > spaceBelow;
    const left = Math.min(rect.left, window.innerWidth - width - 8);

    setStyle(
      openUpward
        ? { bottom: window.innerHeight - rect.top + 4, left, width }
        : { top: rect.bottom + 4, left, width }
    );
    setOpen(true);
  }

  function close() {
    setOpen(false);
  }

  return { triggerRef, open, style, toggle, close };
}
