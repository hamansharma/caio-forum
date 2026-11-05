import { INDEXNOW_KEY, SITE_ORIGIN } from '../../src/data/site';

// Tells IndexNow search engines (Bing and others; not Google) that these
// absolute URLs on this site are new or changed. Never throws: a failed ping
// only means search engines find the page a little later, via the sitemap.
export async function submitToIndexNow(urls) {
  const urlList = urls.filter(url => url.startsWith(`${SITE_ORIGIN}/`)).slice(0, 10000);
  if (!urlList.length) return { ok: false, status: 0 };
  try {
    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: new URL(SITE_ORIGIN).host, key: INDEXNOW_KEY, keyLocation: `${SITE_ORIGIN}/${INDEXNOW_KEY}.txt`, urlList }),
      signal: AbortSignal.timeout(8000),
    });
    return { ok: response.ok, status: response.status };
  } catch (error) {
    console.error('IndexNow submit failed:', error.message);
    return { ok: false, status: 0 };
  }
}
