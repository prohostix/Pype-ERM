import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
export declare const auditLog: (action: string, entityType: string) => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=auditLog.d.ts.map