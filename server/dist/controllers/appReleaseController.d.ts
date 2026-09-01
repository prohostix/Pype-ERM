import { Request, Response } from 'express';
/**
 * @route   GET /api/v1/app-releases/latest?platform=<key>
 * @desc    Get the latest release manifest for the given platform
 * @access  Public
 */
export declare const getLatestRelease: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @route   GET /api/v1/app-releases/download/:platform
 * @desc    Download the latest APK for the given platform
 * @access  Public
 */
export declare const downloadApk: (req: Request, res: Response, next: import("express").NextFunction) => void;
//# sourceMappingURL=appReleaseController.d.ts.map