// Data sets shown in the Data Atlas (/playground/data-atlas). Each entry has
// its own page; data files live under public/data-atlas/<id>/<version>/ so a
// new version gets a new URL and old copies can be cached indefinitely.

export const DATASETS = [
  {
    id: 'us-public-schools',
    title: 'US Public Schools',
    summary: 'Every public school in the 2024–25 NCES directory, joined to 2022–23 enrollment, staffing, lunch-program and demographic data, plus the economics of the surrounding neighborhood.',
    kind: 'Interactive map',
    rows: 102178,
    rowsLabel: 'schools',
    period: 'Locations 2024–25 · Characteristics 2022–23',
    sources: [
      { name: 'NCES Common Core of Data via data.gov', url: 'https://nces.ed.gov/ccd/' },
      { name: 'U.S. Census Bureau ACS 2020–2024', url: 'https://www.census.gov/programs-surveys/acs' },
      { name: 'NCES EDGE School Neighborhood Poverty Estimates', url: 'https://nces.ed.gov/programs/edge/economic/neighborhoodpoverty' },
    ],
    dataUrl: '/data-atlas/us-public-schools/v1',
    highlights: ['Free or reduced-price lunch', 'Students per teacher', 'Enrollment', 'Neighborhood home values', 'Neighborhood income'],
  },
];

export const datasetById = id => DATASETS.find(dataset => dataset.id === id);
export const dataAtlasPath = id => (id ? `/playground/data-atlas/${id}` : '/playground/data-atlas');
