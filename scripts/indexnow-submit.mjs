// Sends every URL in the live sitemaps to IndexNow (Bing and other engines), for
// a first full submission or after big changes. New posts are announced one by
// one as they're published (api/indexnow.js).
//
//   npm run indexnow:submit             # dry run: list what would be sent
//   npm run indexnow:submit -- --apply
import { submitToIndexNow } from '../api/_lib/indexNow.js';
import { SITE_ORIGIN } from '../src/data/site.js';

const apply = process.argv.includes('--apply');
const locs = async url => [...(await (await fetch(url)).text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
const top = await locs(`${SITE_ORIGIN}/sitemap.xml`);
const urls = [];
for (const url of top) urls.push(...(url.endsWith('.xml') ? await locs(url) : [url]));
const unique = [...new Set(urls)];
console.log(`${unique.length} URLs in the sitemaps.`);
if (!apply) { console.log('Dry run; nothing sent. Re-run with --apply.'); process.exit(0); }
const result = await submitToIndexNow(unique);
console.log(result.ok ? `Submitted (HTTP ${result.status}).` : `Not accepted (HTTP ${result.status}).`);
