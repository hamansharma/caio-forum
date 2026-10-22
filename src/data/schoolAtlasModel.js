// Data model for the US Public Schools atlas: field definitions, color modes,
// filters and summary stats. Pure functions over the columnar dataset (one
// array per field, indexed by school), with no React or map code, so the
// planned "Ask the data" query engine can reuse them.

export const STATES = { AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', PR: 'Puerto Rico', GU: 'Guam', VI: 'U.S. Virgin Islands', AS: 'American Samoa', MP: 'Northern Mariana Islands' };
export const LOCALE = { 11: 'City: Large', 12: 'City: Mid-size', 13: 'City: Small', 21: 'Suburb: Large', 22: 'Suburb: Mid-size', 23: 'Suburb: Small', 31: 'Town: Fringe', 32: 'Town: Distant', 33: 'Town: Remote', 41: 'Rural: Fringe', 42: 'Rural: Distant', 43: 'Rural: Remote' };
export const LOCALE_GROUP = { 1: 'City', 2: 'Suburb', 3: 'Town', 4: 'Rural' };
export const RACES = [['WH', 'White', '#7f9cc4'], ['HI', 'Hispanic', '#e08a3c'], ['BL', 'Black', '#8c5fb8'], ['AS', 'Asian', '#2fa6a0'], ['TR', 'Two or more', '#c9b232'], ['AM', 'Am. Indian / Alaska Native', '#c4566c'], ['HP', 'Pacific Islander', '#5aa05a']];
export const gradeLabel = grade => ({ PK: 'PK', KG: 'K', UG: 'Ungraded', AE: 'Adult ed', N: '—' }[grade] ?? String(+grade));

// "nodata" is resolved to a theme color by the map and legend.
export const NO_DATA = 'nodata';
const SEQUENTIAL = ['#2c9c8c', '#8dbb4c', '#e0b028', '#e2702d', '#c4304a'];

// Bins numeric values at `cuts` (after dividing by `div`); the last bin is "No data".
function binner(values, cuts, labels, palette, div = 1) {
  return {
    bins: labels.map((label, k) => ({ label, color: palette[k] })).concat([{ label: 'No data', color: NO_DATA }]),
    of: i => {
      const value = values[i];
      if (value == null) return labels.length;
      const x = value / div;
      for (let k = 0; k < cuts.length; k += 1) if (x < cuts[k]) return k;
      return labels.length - 1;
    },
  };
}

export const COLOR_MODES = [
  { id: 'frl', label: 'Free or reduced-price lunch eligibility' },
  { id: 'ratio', label: 'Students per teacher' },
  { id: 'enr', label: 'Enrollment' },
  { id: 'race', label: 'Majority race or ethnicity' },
  { id: 'level', label: 'School level' },
  { id: 'locale', label: 'City, suburb, town or rural' },
  { id: 'charter', label: 'Charter status' },
];

// Returns { bins: [{ label, color }], of(i) -> bin index } for a color mode.
export function colorMode(D, id) {
  switch (id) {
    case 'ratio': return binner(D.ratio, [12, 15, 18, 22], ['Under 12', '12–15', '15–18', '18–22', '22 or more'], SEQUENTIAL, 10);
    case 'enr': return binner(D.enr, [200, 500, 1000, 2000], ['Under 200', '200–499', '500–999', '1,000–1,999', '2,000 or more'], SEQUENTIAL);
    case 'race': return {
      bins: RACES.map(([, label, color]) => ({ label: `${label} majority`, color })).concat([{ label: 'No single majority', color: '#a4889b' }, { label: 'No data', color: NO_DATA }]),
      of: i => {
        if (D.enr[i] == null) return RACES.length + 1;
        for (let k = 0; k < RACES.length; k += 1) if (D[`r_${RACES[k][0]}`][i] > 50) return k;
        return D.r_WH[i] == null ? RACES.length + 1 : RACES.length;
      },
    };
    case 'level': {
      const map = { Elementary: 0, Middle: 1, High: 2, Secondary: 2, Prekindergarten: 3 };
      const index = D.dict.level.map(level => (level === 'No 2022-23 data' ? 5 : (map[level] ?? 4)));
      return {
        bins: [['Elementary', '#2c9c8c'], ['Middle', '#e0b028'], ['High', '#c4304a'], ['Pre-K', '#8c5fb8'], ['Other or ungraded', '#7f9cc4'], ['No data', NO_DATA]].map(([label, color]) => ({ label, color })),
        of: i => index[D.level[i]],
      };
    }
    case 'locale': {
      const index = D.dict.locale.map(code => +String(code)[0] - 1);
      return {
        bins: [['City', '#c4304a'], ['Suburb', '#e0b028'], ['Town', '#8dbb4c'], ['Rural', '#2c9c8c']].map(([label, color]) => ({ label, color })),
        of: i => index[D.locale[i]],
      };
    }
    case 'charter': {
      const index = D.dict.charter.map(value => (value === 'Yes' ? 0 : value === 'No' ? 1 : 2));
      return {
        bins: [['Charter', '#e2702d'], ['Traditional public', '#5f84b8'], ['No data', NO_DATA]].map(([label, color]) => ({ label, color })),
        of: i => index[D.charter[i]],
      };
    }
    default: return binner(D.frl, [25, 50, 75, 90], ['Under 25%', '25–50%', '50–75%', '75–90%', '90% or more'], SEQUENTIAL);
  }
}

// NCES abbreviates school names ("LAMAR H S", "OAK EL"). Search text spells
// them out too, so "lamar high" and "oak elementary" both match.
const NAME_ABBREVIATIONS = [
  [/\bH S\b/g, 'high school'], [/\bJ H\b/g, 'junior high'], [/\bM S\b/g, 'middle school'], [/\bEL\b/g, 'elementary'],
  [/\bELEM\b/g, 'elementary'], [/\bINT\b/g, 'intermediate'], [/\bACAD\b/g, 'academy'], [/\bSCH\b/g, 'school'],
  [/\bCTR\b/g, 'center'], [/\bCHTR\b/g, 'charter'], [/\bPREP\b/g, 'preparatory'], [/\bSTEM\b/g, 'stem science technology'],
];
export function searchText(name, city) {
  const expanded = NAME_ABBREVIATIONS.reduce((text, [pattern, word]) => text.replace(pattern, word), String(name));
  return `${name} ${expanded} ${city}`.toLowerCase();
}

// Every typed word must appear somewhere in the school's search text.
export function matchesSearch(text, query) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return words.length > 0 && words.every(word => text.includes(word));
}

export const LEVEL_FILTERS = [['Elementary', ['Elementary']], ['Middle', ['Middle']], ['High', ['High', 'Secondary']], ['Pre-K', ['Prekindergarten']], ['Other', ['Other', 'Ungraded', 'Adult Education', 'Not applicable', 'Not reported', 'No 2022-23 data']]];
export const TYPE_FILTERS = [['Traditional', 'trad'], ['Charter', 'charter'], ['Full virtual', 'virt'], ['Alternative / special ed', 'alt']];

export const defaultFilters = () => ({
  state: '',
  levels: new Set(LEVEL_FILTERS.map(([key]) => key)),
  locales: new Set(Object.keys(LOCALE_GROUP)),
  types: new Set(TYPE_FILTERS.map(([, key]) => key)),
});

// 1 for each school that passes the filters (and has a location), else 0.
export function filterSchools(D, filters) {
  const levelOk = D.dict.level.map(level => LEVEL_FILTERS.some(([key, levels]) => filters.levels.has(key) && levels.includes(level)));
  const localeOk = D.dict.locale.map(code => filters.locales.has(String(code)[0]));
  const stateIndex = filters.state ? D.dict.st.indexOf(filters.state) : -1;
  const isCharter = D.dict.charter.map(value => value === 'Yes');
  const isVirtual = D.dict.virtual.map(value => value === 'Full Virtual');
  const isAlternative = D.dict.type.map(type => type === 'Alternative Education School' || type === 'Special Education School');
  const visible = new Uint8Array(D.n);
  for (let i = 0; i < D.n; i += 1) {
    let ok = D.lat[i] != null && D.lon[i] != null && levelOk[D.level[i]] && localeOk[D.locale[i]] && (stateIndex < 0 || D.st[i] === stateIndex);
    if (ok) {
      const type = isVirtual[D.virtual[i]] ? 'virt' : isAlternative[D.type[i]] ? 'alt' : isCharter[D.charter[i]] ? 'charter' : 'trad';
      ok = filters.types.has(type);
    }
    visible[i] = ok ? 1 : 0;
  }
  return visible;
}

export function classify(D, mode) {
  const cls = new Uint8Array(D.n);
  for (let i = 0; i < D.n; i += 1) cls[i] = mode.of(i);
  return cls;
}

// Schools both passing the filters and in a legend bin that isn't hidden.
export function shownMask(visible, cls, hiddenBins) {
  const shown = new Uint8Array(visible.length);
  for (let i = 0; i < visible.length; i += 1) shown[i] = visible[i] && !hiddenBins.has(cls[i]) ? 1 : 0;
  return shown;
}

export function binCounts(visible, cls, binCount) {
  const counts = new Array(binCount).fill(0);
  for (let i = 0; i < visible.length; i += 1) if (visible[i]) counts[cls[i]] += 1;
  return counts;
}

// Lunch eligibility and students-per-teacher are enrollment-weighted.
export function summarize(D, shown) {
  const isCharter = D.dict.charter.map(value => value === 'Yes');
  let schools = 0; let students = 0; let frlStudents = 0; let frlBase = 0; let charter = 0; let ratioStudents = 0; let teachers = 0;
  for (let i = 0; i < D.n; i += 1) {
    if (!shown[i]) continue;
    schools += 1;
    if (isCharter[D.charter[i]]) charter += 1;
    const enrollment = D.enr[i];
    if (enrollment == null) continue;
    students += enrollment;
    if (D.frl[i] != null) { frlStudents += (D.frl[i] * enrollment) / 100; frlBase += enrollment; }
    if (D.fte[i] != null && D.fte[i] > 0) { ratioStudents += enrollment; teachers += D.fte[i] / 10; }
  }
  return {
    schools,
    students,
    frlPercent: frlBase ? Math.round((frlStudents / frlBase) * 100) : null,
    studentsPerTeacher: teachers ? Math.round((ratioStudents / teachers) * 10) / 10 : null,
    charterPercent: schools ? Math.round((charter / schools) * 100) : null,
  };
}

// Loads the dataset (split across two files) and the county map shapes.
export async function loadSchoolAtlas(baseUrl) {
  const get = async file => {
    const response = await fetch(`${baseUrl}/${file}`);
    if (!response.ok) throw new Error(`${file} returned ${response.status}`);
    return response.json();
  };
  const [a, b, topo] = await Promise.all([get('schools-a.json'), get('schools-b.json'), get('us-counties.json')]);
  return { D: Object.assign(a, b), topo };
}
