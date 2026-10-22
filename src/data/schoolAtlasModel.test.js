import { isReliable, formatDollars, formatPovertyRatio, attachNeighborhoods, colorMode, buildPlaceIndex, searchPlaces, filterSchools, defaultFilters } from './schoolAtlasModel';

describe('isReliable', () => {
  it('accepts margins up to 30% of the estimate', () => {
    expect(isReliable(400000, 120000)).toBe(true);
    expect(isReliable(400000, 120001)).toBe(false);
  });

  it('treats top- and bottom-coded values (no margin) as reliable, and missing values as not', () => {
    expect(isReliable(2000001, null)).toBe(true);
    expect(isReliable(null, null)).toBe(false);
  });
});

describe('formatDollars', () => {
  it('formats regular values and spells out census top and bottom codes', () => {
    expect(formatDollars(412300, 'home')).toBe('$412,300');
    expect(formatDollars(2000001, 'home')).toBe('$2M or more');
    expect(formatDollars(9999, 'home')).toBe('Under $10K');
    expect(formatDollars(250001, 'income')).toBe('$250K or more');
    expect(formatDollars(null, 'home')).toBe('—');
  });
});

describe('formatPovertyRatio', () => {
  it('shows the income-to-poverty ratio as a multiple of the poverty line', () => {
    expect(formatPovertyRatio(284)).toBe('2.8×');
    expect(formatPovertyRatio(100)).toBe('1.0×');
    expect(formatPovertyRatio(null)).toBe('—');
  });
});

describe('attachNeighborhoods', () => {
  const schools = () => ({ n: 3, id: ['A1', 'B2', 'C3'] });
  const neighborhoods = {
    n: 3, check: ['A1', 'C3'],
    zcta: ['10001'], zHome: [650000], zHomeMoe: [40000], zIncome: [90000], zIncomeMoe: [5000],
    z: [0, -1, 0], ipr: [284, null, 150], iprSe: [40, null, 30], sources: {},
  };

  it('expands ZIP-level values onto each school', () => {
    const D = schools();
    expect(attachNeighborhoods(D, neighborhoods)).toBe(true);
    expect(D.home).toEqual([650000, null, 650000]);
    expect(D.zcta).toEqual(['10001', null, '10001']);
    expect(D.ipr).toEqual([284, null, 150]);
  });

  it('refuses a file that does not line up with the school list', () => {
    expect(attachNeighborhoods(schools(), { ...neighborhoods, check: ['A1', 'ZZ'] })).toBe(false);
    expect(attachNeighborhoods(schools(), { ...neighborhoods, n: 4 })).toBe(false);
    expect(attachNeighborhoods(schools(), null)).toBe(false);
  });
});

describe('home value color mode', () => {
  it('bins reliable values, separates low-reliability estimates, and marks missing data', () => {
    const D = { home: [120000, 500000, 2000001, 300000, null], homeMoe: [10000, 30000, null, 200000, null] };
    const mode = colorMode(D, 'home');
    const labels = [0, 1, 2, 3, 4].map(i => mode.bins[mode.of(i)].label);
    expect(labels).toEqual(['Under $150K', '$400K–$700K', '$700K or more', 'Low-reliability estimate', 'No data']);
  });
});

describe('places', () => {
  // Two "Washington County" schools in different states, plus a third school.
  const D = {
    n: 3,
    lat: [1, 1, 1], lon: [1, 1, 1],
    st: [0, 1, 1], county: [0, 0, 1], lea: [0, 1, 2], city: ['FAYETTEVILLE', 'Hillsboro', 'Portland'], zip: ['72701', '97123', '97201'],
    level: [0, 0, 0], locale: [0, 0, 0], charter: [0, 0, 0], virtual: [0, 0, 0], type: [0, 0, 0],
    dict: {
      st: ['AR', 'OR'], county: ['Washington County', 'Multnomah County'], lea: ['FAYETTEVILLE SCHOOL DISTRICT', 'Hillsboro SD 1J', 'Portland SD 1J'],
      level: ['Elementary'], locale: ['11'], charter: ['No'], virtual: ['No'], type: ['Regular School'],
    },
  };
  const places = buildPlaceIndex(D);

  it('keeps same-named counties in different states apart and tidies all-caps city names', () => {
    const labels = places.filter(place => place.kind === 'county').map(place => place.label).sort();
    expect(labels).toEqual(['Multnomah County, OR', 'Washington County, AR', 'Washington County, OR']);
    expect(places.find(place => place.kind === 'city' && place.state === 'AR').label).toBe('Fayetteville, AR');
  });

  it('searches every kind of place, honoring the state filter', () => {
    expect(searchPlaces(places, 'washington').map(place => place.label)).toEqual(['Washington County, AR', 'Washington County, OR']);
    expect(searchPlaces(places, 'washington', 'OR').map(place => place.label)).toEqual(['Washington County, OR']);
    expect(searchPlaces(places, '97201')[0].kind).toBe('zip');
    expect(searchPlaces(places, 'w')).toEqual([]);
  });

  it('filters schools to the chosen place', () => {
    const washingtonOR = places.find(place => place.label === 'Washington County, OR');
    expect(Array.from(filterSchools(D, { ...defaultFilters(), place: washingtonOR }))).toEqual([0, 1, 0]);
  });
});
