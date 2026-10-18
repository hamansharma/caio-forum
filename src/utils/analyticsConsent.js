// Visitor consent for Google Analytics cookies. GA itself is loaded in
// public/index.html in Consent Mode; this module records the visitor's choice
// and tells GA about it.

const STORAGE_KEY = 'caio-analytics-consent'; // also read in public/index.html
const OPEN_SETTINGS_EVENT = 'caio:open-cookie-settings';

export function getAnalyticsConsent() {
  try {
    return window.localStorage.getItem(STORAGE_KEY); // 'granted' | 'denied' | null
  } catch {
    return null;
  }
}

// Removes GA's first-party cookies (_ga, _ga_<id>) from this domain and its parents.
function deleteAnalyticsCookies() {
  const hostParts = window.location.hostname.split('.');
  const domains = hostParts.map((_, index) => hostParts.slice(index).join('.'));
  document.cookie.split(';').map(cookie => cookie.split('=')[0].trim()).filter(name => name.startsWith('_ga')).forEach(name => {
    document.cookie = `${name}=; Max-Age=0; path=/`;
    domains.forEach(domain => { document.cookie = `${name}=; Max-Age=0; path=/; domain=.${domain}`; });
  });
}

export function setAnalyticsConsent(granted) {
  const value = granted ? 'granted' : 'denied';
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Storage unavailable (private mode): the choice applies to this visit only.
  }
  window.gtag?.('consent', 'update', { analytics_storage: value });
  if (!granted) deleteAnalyticsCookies();
}

export const openCookieSettings = () => window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));

export function onOpenCookieSettings(handler) {
  window.addEventListener(OPEN_SETTINGS_EVENT, handler);
  return () => window.removeEventListener(OPEN_SETTINGS_EVENT, handler);
}

// Page views are sent from the app (see usePageMeta) rather than by GA itself,
// so each one carries the page's real title. Short delay: a page that updates
// its title again right away (or redirects) is counted once, with its final
// title and URL. Later title changes on the same URL aren't counted again.
let pendingPageView;
let lastTrackedUrl;
export function trackPageView() {
  clearTimeout(pendingPageView);
  pendingPageView = setTimeout(() => {
    const url = window.location.pathname + window.location.search;
    if (url === lastTrackedUrl) return;
    lastTrackedUrl = url;
    window.gtag?.('event', 'page_view', { page_location: window.location.href, page_title: document.title });
  }, 300);
}
