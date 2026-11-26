// Run: npx tsx --test tests/absentDays.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { absentRuleApplies, uncoveredAbsentDays } from '../src/utils/absentDays.js';

const d = (value: string) => new Date(value.includes('T') ? value : `${value}T00:00:00.000Z`);
const absent = (date: string) => ({ date: d(date), status: 'absent' });
const leave = (from: string, to: string, isHalfDay = false, type = 'sick') => ({ type, isHalfDay, startDate: d(from), endDate: d(to) });

test('a date saved twice counts once', () => {
  assert.equal(uncoveredAbsentDays([absent('2026-10-18T18:30:00.000Z'), absent('2026-10-19')], []), 1);
});

test('approved leave covers the day, and a half day covers half', () => {
  const days = [absent('2026-12-07'), absent('2026-12-08'), absent('2026-12-09')];
  assert.equal(uncoveredAbsentDays(days, [leave('2026-12-07', '2026-12-08')]), 1);
  assert.equal(uncoveredAbsentDays(days, [leave('2026-12-09', '2026-12-09', true)]), 2.5);
  assert.equal(uncoveredAbsentDays(days, [leave('2026-12-09', '2026-12-09', false, 'late_coming')]), 3);
});

test('a holiday or a day with a worked record is not deducted', () => {
  assert.equal(uncoveredAbsentDays([absent('2026-12-07'), { date: d('2026-12-07'), status: 'present' }], []), 0);
  assert.equal(uncoveredAbsentDays([absent('2026-12-25')], [], [d('2026-12-25')]), 0);
});

test('the rule starts with the first salary cycle after it was introduced', () => {
  const monthEnd = { startDay: 1, endDay: 31, cycleMode: 'same_month' };
  const midMonth = { startDay: 26, endDay: 25, cycleMode: 'previous_to_current' };
  assert.equal(absentRuleApplies(new Date(2026, 10, 30), monthEnd), false);
  assert.equal(absentRuleApplies(new Date(2026, 11, 1), monthEnd), true);
  assert.equal(absentRuleApplies(new Date(2026, 11, 25), midMonth), false);
  assert.equal(absentRuleApplies(new Date(2026, 11, 26), midMonth), true);
  assert.equal(absentRuleApplies(new Date(2027, 0, 5), midMonth), true);
});
