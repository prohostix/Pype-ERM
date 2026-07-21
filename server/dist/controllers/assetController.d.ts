import { Request, Response } from 'express';
export declare const getAssets: (req: Request, res: Response) => Promise<void>;
export declare const createAsset: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateAsset: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteAsset: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=assetController.d.ts.map