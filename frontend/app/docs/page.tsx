'use client';

import { useCallback, useEffect, useRef } from 'react';

function getTheme(): 'light' | 'dark' {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export default function DocsPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const postTheme = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'alubond-theme', theme: getTheme() },
      window.location.origin,
    );
  }, []);

  useEffect(() => {
    postTheme();

    const observer = new MutationObserver(postTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, [postTheme]);

  return (
    <div className="h-[calc(100dvh-4rem-5.5rem)] lg:h-[calc(100dvh-4rem-1.5rem)]">
      <iframe
        ref={iframeRef}
        src="/docs/user-guide/index.html"
        title="Alubond CRM User Guide"
        className="h-full w-full border-0 bg-[var(--surface)]"
        onLoad={postTheme}
      />
    </div>
  );
}
