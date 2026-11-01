// The AI Time Capsule's rules, shared by the page (src/pages/TimeCapsule.jsx) and
// the server (api/time-capsule.js) so both agree on what's allowed.
//
// There is one canvas per due year ("comes true by the end of 2030"): every pixel
// is one member's prediction. A canvas takes predictions until the year before it
// starts, so each prediction is made at least a full year ahead, and AI reviews
// the whole canvas on the January 1 after it ends. Pixel coordinates are centred
// on (0, 0), so when the canvas grows (a ring of empty pixels added around it)
// nothing moves.

export const START_SIZE = 32;
export const GROW_BY = 16; // 8 pixels added on each side
export const MAX_SIZE = 128;
export const GROW_AT = 0.8; // grow when 80% of the pixels are taken
export const PREDICTIONS_PER_MEMBER = 3; // new predictions per member per calendar year, across all canvases
export const TEXT_MIN = 15;
export const TEXT_MAX = 280;
export const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000; // editable, then locked
export const FIRST_DUE_YEAR = 2027;
export const LAST_DUE_YEAR = 2040;
export const TOPICS = ['Work', 'Health', 'Science', 'Policy', 'Business', 'Everyday life'];
// Mid-tone colors that read on both the dark and daylight themes.
export const COLORS = ['#8b7bf8', '#4ade80', '#38bdf8', '#fb923c', '#f87171', '#c084fc', '#facc15', '#2dd4bf', '#f472b6', '#60a5fa'];

// The calendar year predictions are being made in (the per-member limit resets each year).
export const currentYear = (date = new Date()) => date.getUTCFullYear();
export const allCanvasYears = () => Array.from({ length: LAST_DUE_YEAR - FIRST_DUE_YEAR + 1 }, (_, index) => FIRST_DUE_YEAR + index);
// A canvas is open until the year it covers begins.
export const isOpen = (year, now = new Date()) => year > currentYear(now) && year <= LAST_DUE_YEAR;
export const isCanvasYear = year => Number.isInteger(year) && year >= FIRST_DUE_YEAR && year <= LAST_DUE_YEAR;
// The canvas to show first: the soonest one still open.
export const defaultCanvasYear = (now = new Date()) => Math.min(LAST_DUE_YEAR, Math.max(FIRST_DUE_YEAR, currentYear(now) + 1));
export const cellId = (x, y) => `${x}_${y}`;
export const editableUntil = createdAt => new Date(createdAt).getTime() + EDIT_WINDOW_MS;

export const inBounds = (x, y, size) =>
  Number.isInteger(x) && Number.isInteger(y) && x >= -size / 2 && x < size / 2 && y >= -size / 2 && y < size / 2;

// The canvas size after `count` pixels are taken.
export function sizeFor(count, size = START_SIZE) {
  let next = size;
  while (next < MAX_SIZE && count >= GROW_AT * next * next) next += GROW_BY;
  return next;
}

export const isFull = count => count >= MAX_SIZE * MAX_SIZE;

// Checks a prediction's fields; returns { value } or { error }.
export function validatePrediction(input) {
  const text = typeof input?.text === 'string' ? input.text.replace(/\s+/g, ' ').trim() : '';
  if (text.length < TEXT_MIN) return { error: `Write at least ${TEXT_MIN} characters.` };
  if (text.length > TEXT_MAX) return { error: `Keep it to ${TEXT_MAX} characters.` };
  if (!TOPICS.includes(input.topic)) return { error: 'Choose a topic.' };
  const color = Number(input.color);
  if (!Number.isInteger(color) || color < 0 || color >= COLORS.length) return { error: 'Choose a color.' };
  return { value: { text, topic: input.topic, color } };
}

// The year's digits, drawn faintly behind the predictions: a 3x5 pixel font
// doubled to 6x10, centred on the canvas. Returns [x, y] cells.
const DIGITS = {
  0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'], 3: ['111', '001', '111', '001', '111'],
  4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'], 7: ['111', '001', '001', '001', '001'],
  8: ['111', '101', '111', '101', '111'], 9: ['111', '101', '111', '001', '111'],
};
export function yearOutline(year) {
  const digits = String(year).split('');
  const width = digits.length * 6 + (digits.length - 1) * 2;
  const left = -Math.floor(width / 2);
  const cells = [];
  digits.forEach((digit, index) => DIGITS[digit].forEach((row, r) => row.split('').forEach((bit, c) => {
    if (bit !== '1') return;
    for (let dy = 0; dy < 2; dy += 1) for (let dx = 0; dx < 2; dx += 1) {
      cells.push([left + index * 8 + c * 2 + dx, -5 + r * 2 + dy]);
    }
  })));
  return cells;
}

// Predictions fill in the year's digits first; once every digit pixel is taken,
// the rest of the canvas opens. `outlineTaken` is how many digit pixels are taken.
const outlineSets = new Map();
export function outlineCells(year) {
  if (!outlineSets.has(year)) outlineSets.set(year, new Set(yearOutline(year).map(([x, y]) => cellId(x, y))));
  return outlineSets.get(year);
}
export const isOutlineCell = (year, cell) => outlineCells(year).has(cell);
export const outlineFull = (year, outlineTaken) => outlineTaken >= outlineCells(year).size;
export const canPlaceAt = (year, cell, outlineTaken) => isOutlineCell(year, cell) || outlineFull(year, outlineTaken);

// A prediction reads as one sentence after "By the end of 2030,". Lower-case
// its first letter when it's an ordinary capital ("Most…"), not an acronym ("AI…").
export const continueSentence = text => (/^[A-Z][a-z]/.test(text) ? text[0].toLowerCase() + text.slice(1) : text);
export const predictionSentence = (year, text) => `By the end of ${year}, ${continueSentence(text)}`;

// Link that opens a canvas with one prediction selected (shareable).
export const PREDICTION_PAGE = '/playground/time-capsule';
export const predictionPath = (year, cell) => `${PREDICTION_PAGE}?year=${year}&p=${encodeURIComponent(cell)}`;
