// Builds public/data-atlas/us-public-schools/v1/neighborhoods.json: economic
// context for each school in the atlas, from two public-domain federal sources.
//
//   1. Census ACS 5-year (2020-2024), by ZIP Code Tabulation Area (joined on
//      the school's ZIP): median home value (B25077) and median household
//      income (B19013), each with its margin of error.
//   2. NCES EDGE School Neighborhood Poverty Estimates (2021-22), joined on the
//      NCES school ID: income-to-poverty ratio of families near the school
//      (100 = at the poverty line), with its standard error.
//
//   npm run data:school-neighborhoods                       # download sources and build
//   npm run data:school-neighborhoods -- --sources <dir>    # reuse previously downloaded files
//
// Output arrays are aligned with the school order in schools-a/b.json.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ACS_YEAR = 2024;
const ACS_BASE = `https://www2.census.gov/programs-surveys/acs/summary_file/${ACS_YEAR}/table-based-SF/data/5YRData`;
const EDGE_LAYER = 'https://nces.ed.gov/opengis/rest/services/K12_School_Locations/EDGE_SIDE_1822_PUBLICSCH_2122/MapServer/1/query';
const DATA_DIR = new URL('../../public/data-atlas/us-public-schools/v1/', import.meta.url);

const args = process.argv.slice(2);
const sourcesArg = args.includes('--sources') ? args[args.indexOf('--sources') + 1] : null;
const sourcesDir = sourcesArg || mkdtempSync(join(tmpdir(), 'school-neighborhoods-'));
mkdirSync(sourcesDir, { recursive: true });

async function download(url, file) {
  const path = join(sourcesDir, file);
  if (existsSync(path)) return path;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  writeFileSync(path, Buffer.from(await response.arrayBuffer()));
  return path;
}

async function downloadEdge() {
  const path = join(sourcesDir, 'edge-side-2122.json');
  if (existsSync(path)) return path;
  const rows = [];
  for (let offset = 0; ; offset += 2000) {
    const params = new URLSearchParams({ where: '1=1', outFields: 'NCESSCH,IPR_EST,IPR_SE', returnGeometry: 'false', orderByFields: 'OBJECTID', resultOffset: String(offset), resultRecordCount: '2000', f: 'json' });
    const response = await fetch(`${EDGE_LAYER}?${params}`);
    if (!response.ok) throw new Error(`EDGE returned ${response.status} at offset ${offset}`);
    const body = await response.json();
    if (body.error) throw new Error(`EDGE error: ${JSON.stringify(body.error)}`);
    for (const { attributes: a } of body.features) rows.push([a.NCESSCH, a.IPR_EST, a.IPR_SE]);
    if (body.features.length < 2000) break;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  writeFileSync(path, JSON.stringify({ rows }));
  return path;
}

// ACS summary-file values: numbers, or special codes. -666666666 means too few
// sample cases (no estimate); a margin of -333333333 means the estimate is a
// top or bottom code (e.g. 2000001 = "$2,000,000 or more"), so it has no margin.
function readAcsTable(path) {
  const byZcta = new Map();
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.startsWith('860Z200US')) continue;
    const [geo, estimate, margin] = line.split('|');
    const value = Number(estimate);
    if (!Number.isFinite(value) || value < 0) continue;
    const moe = Number(margin);
    byZcta.set(geo.slice('860Z200US'.length), [value, Number.isFinite(moe) && moe >= 0 ? moe : null]);
  }
  return byZcta;
}

const readJson = file => JSON.parse(readFileSync(new URL(file, DATA_DIR), 'utf8'));
const D = Object.assign(readJson('schools-a.json'), readJson('schools-b.json'));

console.log(`Sources directory: ${sourcesDir}`);
const homeTable = readAcsTable(await download(`${ACS_BASE}/acsdt5y${ACS_YEAR}-b25077.dat`, `acsdt5y${ACS_YEAR}-b25077.dat`));
const incomeTable = readAcsTable(await download(`${ACS_BASE}/acsdt5y${ACS_YEAR}-b19013.dat`, `acsdt5y${ACS_YEAR}-b19013.dat`));
const edge = new Map(JSON.parse(readFileSync(await downloadEdge(), 'utf8')).rows.map(([id, est, se]) => [String(id), [est, se]]));

// ZCTAs are stored once and referenced by index, since many schools share a ZIP.
const zctaIndex = new Map();
const out = { zcta: [], zHome: [], zHomeMoe: [], zIncome: [], zIncomeMoe: [], z: [], ipr: [], iprSe: [] };
let homeCount = 0; let incomeCount = 0; let iprCount = 0;
for (let i = 0; i < D.n; i += 1) {
  const zip = String(D.zip[i] ?? '').padStart(5, '0').slice(0, 5);
  const home = homeTable.get(zip);
  const income = incomeTable.get(zip);
  if (home || income) {
    if (!zctaIndex.has(zip)) {
      zctaIndex.set(zip, out.zcta.length);
      out.zcta.push(zip);
      out.zHome.push(home ? home[0] : null); out.zHomeMoe.push(home ? home[1] : null);
      out.zIncome.push(income ? income[0] : null); out.zIncomeMoe.push(income ? income[1] : null);
    }
    out.z.push(zctaIndex.get(zip));
  } else {
    out.z.push(-1);
  }
  if (home) homeCount += 1;
  if (income) incomeCount += 1;
  const ipr = edge.get(String(D.id[i]));
  out.ipr.push(ipr ? ipr[0] : null); out.iprSe.push(ipr ? ipr[1] : null);
  if (ipr) iprCount += 1;
}

const result = {
  n: D.n,
  // First and last school IDs, so the page can confirm the arrays line up with the school files.
  check: [String(D.id[0]), String(D.id[D.n - 1])],
  sources: {
    acs: { name: `U.S. Census Bureau, American Community Survey ${ACS_YEAR - 4}–${ACS_YEAR} 5-year estimates`, tables: ['B25077 Median value (owner-occupied)', 'B19013 Median household income'], geography: 'ZIP Code Tabulation Area, joined on school ZIP', url: 'https://www.census.gov/programs-surveys/acs', topCodes: { home: [9999, 2000001], income: [2499, 250001] } },
    edge: { name: 'NCES EDGE School Neighborhood Poverty Estimates, 2021–22 (ACS 2018–2022)', geography: 'Neighborhood around each school, joined on NCES school ID', url: 'https://nces.ed.gov/programs/edge/economic/neighborhoodpoverty' },
  },
  ...out,
};
writeFileSync(new URL('neighborhoods.json', DATA_DIR), JSON.stringify(result));
console.log(`Schools: ${D.n} · home value: ${homeCount} · household income: ${incomeCount} · neighborhood poverty ratio: ${iprCount} · ZCTAs referenced: ${out.zcta.length}`);
