import { useEffect } from 'react';

// Pre-rendered pages (scripts/prerender.mjs) ship their structured data in
// <script id="page-jsonld">; the app takes that element over so there's never
// a second copy.
const ELEMENT_ID = 'page-jsonld';

// Adds page-specific schema.org data (JSON-LD) to <head> and removes it when the
// page changes, so search engines see structured data for the current page only.
export default function useStructuredData(data) {
  const json = data ? JSON.stringify(data) : null;
  useEffect(() => {
    document.getElementById(ELEMENT_ID)?.remove();
    if (!json) return undefined;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = ELEMENT_ID;
    script.textContent = json;
    document.head.appendChild(script);
    return () => script.remove();
  }, [json]);
}
