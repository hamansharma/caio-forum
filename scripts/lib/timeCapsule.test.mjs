import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COLORS, GROW_AT, MAX_SIZE, START_SIZE, allCanvasYears, defaultCanvasYear, inBounds, isCanvasYear, isFull, isOpen, sizeFor, validatePrediction, yearOutline,
} from '../../src/data/timeCapsule.js';

const valid = { text: 'Most US hospitals use AI scribes in outpatient visits.', topic: 'Health', color: 2 };
const nov2026 = new Date('2026-11-01T12:00:00Z');

test('a valid prediction passes and its text is tidied', () => {
  const { value, error } = validatePrediction({ ...valid, text: '  Most US hospitals   use AI scribes in outpatient visits. ' });
  assert.equal(error, undefined);
  assert.equal(value.text, 'Most US hospitals use AI scribes in outpatient visits.');
});

test('predictions are checked field by field', () => {
  assert.ok(validatePrediction({ ...valid, text: 'Too short' }).error);
  assert.ok(validatePrediction({ ...valid, text: 'x'.repeat(281) }).error);
  assert.ok(validatePrediction({ ...valid, topic: 'Sports' }).error);
  assert.ok(validatePrediction({ ...valid, color: COLORS.length }).error);
  assert.ok(validatePrediction(null).error);
});

test('there is one canvas per due year, 2027 to 2040', () => {
  const years = allCanvasYears();
  assert.equal(years[0], 2027);
  assert.equal(years.at(-1), 2040);
  assert.equal(years.length, 14);
  assert.ok(!isCanvasYear(2026) && !isCanvasYear(2041) && !isCanvasYear(2030.5));
});

test('a canvas takes predictions until its own year begins', () => {
  assert.equal(isOpen(2026, nov2026), false, 'nothing due at the end of the current year');
  assert.equal(isOpen(2027, nov2026), true);
  assert.equal(isOpen(2040, nov2026), true);
  assert.equal(isOpen(2027, new Date('2027-01-01T00:00:00Z')), false, 'the 2027 canvas closes when 2027 starts');
  assert.equal(defaultCanvasYear(nov2026), 2027);
  assert.equal(defaultCanvasYear(new Date('2031-05-01T00:00:00Z')), 2032);
});

test('the canvas grows by a ring when 80% full and stops at the maximum', () => {
  assert.equal(sizeFor(0), START_SIZE);
  assert.equal(sizeFor(Math.ceil(GROW_AT * 32 * 32) - 1), 32);
  assert.equal(sizeFor(Math.ceil(GROW_AT * 32 * 32)), 48);
  assert.equal(sizeFor(10_000, 64), 112);
  assert.equal(sizeFor(15_000, 64), 128);
  assert.equal(isFull(MAX_SIZE * MAX_SIZE), true);
});

test('pixels are centred on 0,0 and must be on the canvas', () => {
  assert.ok(inBounds(-16, -16, 32));
  assert.ok(inBounds(15, 15, 32));
  assert.ok(!inBounds(16, 0, 32));
  assert.ok(!inBounds(0.5, 0, 32));
  assert.ok(inBounds(-24, 23, 48), 'a grown canvas keeps old pixels and adds a ring');
});

test('the year outline fits inside the smallest canvas', () => {
  for (const year of allCanvasYears()) assert.ok(yearOutline(year).every(([x, y]) => inBounds(x, y, START_SIZE)));
});

test('predictions fill the year digits first, then the rest of the canvas opens', async () => {
  const { canPlaceAt, isOutlineCell, outlineCells, outlineFull } = await import('../../src/data/timeCapsule.js');
  const digits = outlineCells(2027);
  const onDigit = [...digits][0];
  const offDigit = '-16_-16';
  assert.ok(isOutlineCell(2027, onDigit) && !isOutlineCell(2027, offDigit));
  assert.ok(canPlaceAt(2027, onDigit, 0));
  assert.ok(!canPlaceAt(2027, offDigit, 0), 'outside the digits is blocked at first');
  assert.ok(!canPlaceAt(2027, offDigit, digits.size - 1), 'still blocked with one digit pixel left');
  assert.ok(outlineFull(2027, digits.size));
  assert.ok(canPlaceAt(2027, offDigit, digits.size), 'opens once every digit pixel is taken');
});
