// Run: npx tsx --test tests/videoQuota.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDailyQuotaFree } from '../src/utils/videoAccess.js';

const now = new Date('2026-11-28T06:00:00Z');
const earlier = new Date('2026-11-24T06:00:00Z');
const today = new Date('2026-11-28T05:00:00Z');
const log = (extra: object) => ({ isCompleted: false, videoDuration: 300, watchDuration: 60, completedAt: null, lastWatchedAt: today, ...extra });

test('a video completed on an earlier day is free to replay', () => {
  assert.equal(isDailyQuotaFree(log({ isCompleted: true, completedAt: earlier }), now), true);
  assert.equal(isDailyQuotaFree(log({ isCompleted: true, lastWatchedAt: earlier }), now), true);
  assert.equal(isDailyQuotaFree(log({ videoDuration: 0, lastWatchedAt: earlier }), now), true);
});

test('new, unfinished and completed-today videos use the quota', () => {
  assert.equal(isDailyQuotaFree(null, now), false);
  assert.equal(isDailyQuotaFree(log({ lastWatchedAt: earlier }), now), false);
  assert.equal(isDailyQuotaFree(log({ isCompleted: true, completedAt: today }), now), false);
  assert.equal(isDailyQuotaFree(log({ videoDuration: 0 }), now), false);
});

test('the day changes at midnight IST', () => {
  assert.equal(isDailyQuotaFree(log({ completedAt: new Date('2026-11-27T18:29:00Z') }), now), true);
  assert.equal(isDailyQuotaFree(log({ completedAt: new Date('2026-11-27T18:31:00Z') }), now), false);
});
