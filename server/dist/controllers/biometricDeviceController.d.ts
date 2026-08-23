import { Request, Response } from 'express';
export declare const getDevices: (req: Request, res: Response) => Promise<void>;
export declare const getDevice: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createDevice: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateDevice: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteDevice: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=biometricDeviceController.d.ts.map