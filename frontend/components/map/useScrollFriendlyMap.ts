'use client';

import { useEffect, useState } from 'react';

const MOBILE_MAP_QUERY = '(max-width: 1023px)';

export function useScrollFriendlyMap() {
  const [isMobile, setIsMobile] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(MOBILE_MAP_QUERY);
    const sync = () => {
      setIsMobile(media.matches);
      if (!media.matches) {
        setActive(false);
      }
    };
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  return {
    isMobile,
    active,
    interactive: !isMobile || active,
    activate: () => setActive(true),
    deactivate: () => setActive(false),
  };
}
