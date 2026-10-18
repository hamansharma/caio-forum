import { useEffect } from 'react';

// Adds page-specific schema.org data (JSON-LD) to <head> and removes it when the
// page changes, so search engines see structured data for the current page only.
export default function useStructuredData(data) {
  const json = data ? JSON.stringify(data) : null;
  useEffect(() => {
    if (!json) return undefined;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = json;
    document.head.appendChild(script);
    return () => script.remove();
  }, [json]);
}
