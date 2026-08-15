import { Response } from 'express';
export declare const getStudents: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
export declare const getStudent: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
export declare const createStudent: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
export declare const updateStudent: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
export declare const deleteStudent: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
export declare const approveStudent: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
export declare const bulkImportStudents: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
export declare const notifyStudent: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
export declare const getInternalMarks: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
export declare const getInternalMark: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
export declare const createInternalMark: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
export declare const updateInternalMark: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
export declare const deleteInternalMark: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
export declare const uploadStudentDocument: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
export declare const bulkEnrollmentUpdate: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
export declare const updateAdmissionProgress: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
export declare const getStudentEnrollments: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * POST /students/bulk-update-program
 * Org admin: update university + program on the latest enrollment for a set of students
 */
export declare const bulkUpdateProgram: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * POST /students/bulk-record-payment
 * Org admin: manually record a payment against the latest enrollment for a set of students
 */
export declare const bulkRecordPayment: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
//# sourceMappingURL=studentController.d.ts.map