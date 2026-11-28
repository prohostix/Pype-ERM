// Run: npx tsx --test tests/videoGap.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeGapStatuses, GapLogInfo } from '../src/utils/videoGap.js';

const watchedAt = new Date('2026-11-28T05:37:00Z');
const unlockAt = new Date('2026-11-29T18:30:00Z'); // 30 Nov, 12:00 AM IST
const status = (prev: GapLogInfo, now: Date) => computeGapStatuses(['a', 'b'], new Map([['a', prev]]), 2, now).get('b')!;

test('a watched video with no saved length starts the countdown', () => {
  const prev = { isCompleted: false, videoDuration: 0, watchDuration: 580, lastWatchedAt: watchedAt };
  const waiting = status(prev, watchedAt);
  assert.equal(waiting.locked && waiting.reason, 'waiting');
  assert.deepEqual(waiting.locked && waiting.unlockAt, unlockAt);
  assert.equal(status(prev, unlockAt).locked, false);
});

test('a partly watched video with a saved length still has to be completed', () => {
  const s = status({ isCompleted: false, videoDuration: 600, watchDuration: 100, lastWatchedAt: watchedAt }, unlockAt);
  assert.equal(s.locked && s.reason, 'previous_incomplete');
});
