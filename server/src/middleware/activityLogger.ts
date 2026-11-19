import { Request, Response, NextFunction } from 'express';
import { logActivity, shouldAutoLog, actionForMethod, snapshotBefore, describeRoute } from '../utils/activityLog.js';

/**
 * Global middleware recording every logged-in create / update / delete request, plus logins.
 * `req.user` is only set later by `protect` on each router, so the actor is read on 'finish'.
 */
export const activityLogger = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const path = describeRoute(req.originalUrl || req.url).path;

    // Login: the user is not on the request yet, so take the actor from the response
    if (req.method === 'POST' && /^\/auth\/login/.test(path)) {
      const email = String(req.body?.email || '').trim().slice(0, 200);
      let loggedIn: any = null;
      const originalJson = res.json.bind(res);
      res.json = ((data: any) => { loggedIn = data?.data?.user || null; return originalJson(data); }) as any;
      res.on('finish', () => {
        const ok = res.statusCode < 400 && loggedIn?.id;
        logActivity(req, {
          action: ok ? 'login' : 'login_failed',
          entityType: 'auth',
          entityId: ok ? String(loggedIn.id) : '',
          description: ok ? undefined : `${email || 'unknown email'} (${res.statusCode})`,
          statusCode: res.statusCode,
          actor: ok ? { id: loggedIn.id, type: loggedIn.role === 'faculty' ? 'faculty' : 'user', name: loggedIn.name, role: loggedIn.role, organizationId: loggedIn.organizationId } : undefined,
        });
      });
      return next();
    }

    if (!shouldAutoLog(req) || !req.headers.authorization) return next();

    // What the row looked like before this request changes it (has to be read before the handler runs)
    const before = await snapshotBefore(req);

    res.on('finish', () => {
      if (!(req as any).user) return; // rejected before auth
      const base = actionForMethod(req.method);
      const isRead = req.method === 'GET';
      const query = req.query && Object.keys(req.query).length ? { query: req.query } : undefined;
      logActivity(req, {
        action: res.statusCode < 400 ? base : `${base}_failed`,
        oldValue: res.statusCode < 400 ? before : undefined,
        // reads record the filters used, writes record what was sent
        newValue: isRead ? query : (req.body && Object.keys(req.body).length ? req.body : undefined),
        statusCode: res.statusCode,
      });
    });
  } catch (err) {
    console.error('Activity logger error:', (err as any)?.message || err);
  }
  next();
};
