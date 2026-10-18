import { useEffect } from 'react';
import { trackPageView } from '../utils/analyticsConsent';

export const publicOrigin = 'https://caioleadership.com';

function upsertMeta(selector, attribute, value) {
  let tag = document.querySelector(selector);
  if (!tag) {
    tag = document.createElement('meta');
    const [, name] = selector.match(/\[.+?="(.+?)"\]/) || [];
    if (name) tag.setAttribute(attribute, name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', value);
}

// `pending: true` means the page is still loading its real title (e.g. a post
// being fetched); the analytics page view waits until it's false.
export default function usePageMeta(title, description, { canonicalPath, noIndex = false, pending = false } = {}) {
  useEffect(() => {
    document.title = title;
    upsertMeta('meta[name="description"]', 'name', description);
    upsertMeta('meta[property="og:description"]', 'property', description);
    upsertMeta('meta[property="og:title"]', 'property', title);
    upsertMeta('meta[name="twitter:description"]', 'name', description);
    upsertMeta('meta[name="twitter:title"]', 'name', title);
    upsertMeta('meta[name="robots"]', 'name', noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
    const path = canonicalPath || window.location.pathname;
    const canonicalUrl = `${publicOrigin}${path}`;
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.setAttribute('rel', 'canonical'); document.head.appendChild(canonical); }
    canonical.setAttribute('href', canonicalUrl);
    upsertMeta('meta[property="og:url"]', 'property', canonicalUrl);
    if (!pending) trackPageView();
  }, [title, description, canonicalPath, noIndex, pending]);
}
