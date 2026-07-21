import { Response } from 'express';
export declare const getPayrolls: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
export declare const getPayroll: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
export declare const createPayroll: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
export declare const updatePayroll: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
export declare const deletePayroll: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
export declare const processPayroll: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
export declare const confirmPayroll: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
export declare const markPayrollPaid: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
export declare const generateMonthlyPayroll: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
export declare const transferToFinance: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
export declare const getPayrollBatches: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
export declare const getPayrollBatch: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
export declare const financeApprovePayrollBatch: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
export declare const financeRejectPayrollBatch: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
export declare const markBatchPaymentInProgress: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
export declare const completeBatchPayment: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
//# sourceMappingURL=payrollController.d.ts.map