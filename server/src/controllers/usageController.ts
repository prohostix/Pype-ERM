import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Platform usage from heartbeats. The app sends its state every ~30 seconds:
 *   active = tab in front, window focused, input within the idle limit
 *   idle   = tab in front but no input for a while
 *   away   = tab hidden, or another window has focus
 * The time between two beats is credited to the state of the newer beat. A gap longer than
 * MAX_GAP (sleep, offline, crash) is NOT credited: it starts a new block instead.
 */
const MAX_GAP_MS = 75_000;
const MIN_INTERVAL_MS = 8_000;
const MAX_SEGMENTS = 600;
const MAX_PAGES = 40;
const STATES: Record<string, 'a' | 'i' | 'w'> = { active: 'a', idle: 'i', away: 'w' };
const IST_MS = 5.5 * 3600_000;

export const istDay = (ms: number) => new Date(ms + IST_MS).toISOString().slice(0, 10);

const lastBeat = new Map<string, number>(); // cheap per-user guard before touching the database

export const heartbeat = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user;
  // students and faculty are not tracked (faculty are not in the user table)
  if (!user?.organizationId || ['student', 'faculty', 'center_student'].includes(user.role)) {
    res.json({ success: true, tracked: false });
    return;
  }
  const code = STATES[String(req.body?.state)];
  if (!code) { res.status(400).json({ success: false, message: 'Unknown state' }); return; }
  const page = String(req.body?.page || '').trim().slice(0, 80) || 'unknown';

  const now = Date.now();
  if (now - (lastBeat.get(user.id) || 0) < MIN_INTERVAL_MS) { res.json({ success: true, skipped: true }); return; }
  lastBeat.set(user.id, now);

  const date = istDay(now);
  const row = await prisma.usageDay.findUnique({ where: { userId_date: { userId: user.id, date } } });
  const nowDate = new Date(now);

  if (!row) {
    // first beat of the day: nothing to credit yet
    await prisma.usageDay.create({
      data: { organizationId: user.organizationId, userId: user.id, date, firstSeen: nowDate, lastSeen: nowDate, lastState: code, segments: [[now, now, code]] },
    }).catch(() => { /* another beat created it first */ });
    res.json({ success: true });
    return;
  }

  const last = row.lastSeen ? row.lastSeen.getTime() : now;
  const gap = now - last;
  if (gap < 0) { res.json({ success: true, skipped: true }); return; } // clock went backwards
  const credited = gap <= MAX_GAP_MS ? gap / 1000 : 0;

  const segments: any[] = Array.isArray(row.segments) ? [...(row.segments as any[])] : [];
  const tail = segments[segments.length - 1];
  if (credited > 0 && tail && tail[2] === code && tail[1] === last) tail[1] = now;       // same state, still contiguous: extend
  else segments.push([credited > 0 ? last : now, now, code]);                              // otherwise start a block
  while (segments.length > MAX_SEGMENTS) segments.shift();

  const pages: Record<string, number> = row.pages && typeof row.pages === 'object' ? { ...(row.pages as any) } : {};
  if (code === 'a' && credited > 0 && (pages[page] !== undefined || Object.keys(pages).length < MAX_PAGES)) pages[page] = (pages[page] || 0) + credited;

  // the guard on lastSeen makes sure two requests cannot credit the same stretch twice
  const updated = await prisma.usageDay.updateMany({
    where: { id: row.id, lastSeen: row.lastSeen },
    data: {
      activeSec: row.activeSec + (code === 'a' ? credited : 0),
      idleSec: row.idleSec + (code === 'i' ? credited : 0),
      awaySec: row.awaySec + (code === 'w' ? credited : 0),
      leaves: row.leaves + (credited > 0 && row.lastState === 'a' && code === 'w' ? 1 : 0),
      lastSeen: nowDate, lastState: code, pages, segments,
    },
  });
  res.json({ success: true, skipped: updated.count === 0 });
});

// @desc    The signed-in user's own usage for a day
// @route   GET /api/v1/usage/me?date=YYYY-MM-DD
export const getMyUsage = asyncHandler(async (req: AuthRequest, res: Response) => {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.date || '')) ? String(req.query.date) : istDay(Date.now());
  const row = await prisma.usageDay.findUnique({ where: { userId_date: { userId: req.user.id, date } } });
  res.json({ success: true, data: row });
});
