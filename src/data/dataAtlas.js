// Data sets shown in the Data Atlas (/playground/data-atlas). Each entry has
// its own page; data files live under public/data-atlas/<id>/<version>/ so a
// new version gets a new URL and old copies can be cached indefinitely.

export const DATASETS = [
  {
    id: 'us-public-schools',
    title: 'US Public Schools',
    summary: 'Every public school in the 2024–25 NCES directory, joined to 2022–23 enrollment, staffing, lunch-program and demographic data.',
    kind: 'Interactive map',
    rows: 102178,
    rowsLabel: 'schools',
    period: 'Locations 2024–25 · Characteristics 2022–23',
    source: { name: 'NCES Common Core of Data via data.gov', url: 'https://nces.ed.gov/ccd/' },
    dataUrl: '/data-atlas/us-public-schools/v1',
    highlights: ['Free or reduced-price lunch', 'Students per teacher', 'Enrollment', 'Charter and virtual schools'],
  },
];

export const datasetById = id => DATASETS.find(dataset => dataset.id === id);
export const dataAtlasPath = id => (id ? `/playground/data-atlas/${id}` : '/playground/data-atlas');
