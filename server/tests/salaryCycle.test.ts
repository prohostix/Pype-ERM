// Run: npx tsx --test tests/salaryCycle.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { salaryCycleDates } from '../src/utils/salaryCycle.js';
import { salaryCycleDates as previewDates } from '../../client/src/lib/salaryCycle.js';

const day = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const range = (startDay: number, endDay: number, cycleMode: string, year: number, month: number) => {
  const { startDate, endDate } = salaryCycleDates({ startDay, endDay, cycleMode }, year, month);
  return `${day(startDate)} to ${day(endDate)}`;
};

test('1st to end of month stops on the last day, including for a saved 1–30', () => {
  for (const end of [30, 31]) {
    assert.equal(range(1, end, 'same_month', 2026, 12), '2026-12-1 to 2026-12-31');
    assert.equal(range(1, end, 'same_month', 2026, 11), '2026-11-1 to 2026-11-30');
    assert.equal(range(1, end, 'same_month', 2027, 2), '2027-2-1 to 2027-2-28');
    assert.equal(range(1, end, 'same_month', 2028, 2), '2028-2-1 to 2028-2-29');
  }
});

test('cycles across two months keep their days', () => {
  assert.equal(range(26, 25, 'previous_to_current', 2026, 12), '2026-11-26 to 2026-12-25');
  assert.equal(range(26, 25, 'previous_to_current', 2027, 1), '2026-12-26 to 2027-1-25');
  assert.equal(range(31, 30, 'previous_to_current', 2027, 3), '2027-3-1 to 2027-3-30');
});

test('back-to-back cycles leave no gap or overlap over four years', () => {
  const cycles = [{ startDay: 1, endDay: 30, cycleMode: 'same_month' }, { startDay: 1, endDay: 31, cycleMode: 'same_month' }];
  for (let end = 1; end <= 30; end++) cycles.push({ startDay: end + 1, endDay: end, cycleMode: 'previous_to_current' });
  for (const cycle of cycles) {
    for (let m = 1; m < 48; m++) {
      const last = salaryCycleDates(cycle, 2026, m).endDate;
      const next = salaryCycleDates(cycle, 2026, m + 1).startDate;
      const expected = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
      assert.equal(day(next), day(expected), `${cycle.startDay}–${cycle.endDay}, month ${m}`);
    }
  }
});

test('the preview on screen matches the payroll calculation', () => {
  for (const cycleMode of ['same_month', 'previous_to_current']) {
    for (let startDay = 1; startDay <= 31; startDay++) {
      for (let endDay = 1; endDay <= 31; endDay++) {
        for (let m = 1; m <= 14; m++) {
          assert.deepEqual(previewDates({ startDay, endDay, cycleMode }, 2027, m), salaryCycleDates({ startDay, endDay, cycleMode }, 2027, m));
        }
      }
    }
  }
});
