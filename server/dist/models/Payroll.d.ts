import mongoose, { Document } from 'mongoose';
export interface IPayroll extends Document {
    organizationId: mongoose.Types.ObjectId;
    employeeId: mongoose.Types.ObjectId;
    month: string;
    basicSalary: number;
    allowances: {
        hra?: number;
        transport?: number;
        medical?: number;
        other?: number;
    };
    deductions: {
        tax?: number;
        pf?: number;
        insurance?: number;
        other?: number;
    };
    bonus?: number;
    overtime?: number;
    grossSalary: number;
    netSalary: number;
    status: 'draft' | 'processed' | 'confirmed' | 'transferred_to_finance' | 'paid';
    confirmedBy?: mongoose.Types.ObjectId;
    confirmedAt?: Date;
    transferredToFinanceBy?: mongoose.Types.ObjectId;
    transferredToFinanceAt?: Date;
    financeApprovedBy?: mongoose.Types.ObjectId;
    financeApprovedAt?: Date;
    paymentDate?: Date;
    paymentMethod?: 'bank_transfer' | 'cash' | 'cheque';
    paymentReference?: string;
    processedBy?: mongoose.Types.ObjectId;
    processedAt?: Date;
    remarks?: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IPayroll, {}, {}, {}, mongoose.Document<unknown, {}, IPayroll, {}, {}> & IPayroll & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Payroll.d.ts.map