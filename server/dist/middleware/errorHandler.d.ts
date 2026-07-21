import { Request, Response, NextFunction } from 'express';
export interface ErrorResponse extends Error {
    statusCode?: number;
    errors?: any[];
}
export declare const errorHandler: (err: ErrorResponse, req: Request, res: Response, next: NextFunction) => void;
export declare const notFound: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=errorHandler.d.ts.map