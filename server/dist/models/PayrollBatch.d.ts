import mongoose, { Document } from 'mongoose';
export interface IPayrollBatch extends Document {
    organizationId: mongoose.Types.ObjectId;
    batchNumber: string;
    month: string;
    payrollIds: mongoose.Types.ObjectId[];
    totalAmount: number;
    employeeCount: number;
    status: 'pending_finance_approval' | 'approved_by_finance' | 'payment_in_progress' | 'completed' | 'rejected';
    transferredBy: mongoose.Types.ObjectId;
    transferredAt: Date;
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    rejectedBy?: mongoose.Types.ObjectId;
    rejectedAt?: Date;
    rejectionReason?: string;
    completedAt?: Date;
    remarks?: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IPayrollBatch, {}, {}, {}, mongoose.Document<unknown, {}, IPayrollBatch, {}, {}> & IPayrollBatch & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=PayrollBatch.d.ts.map