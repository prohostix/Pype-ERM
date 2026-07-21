import mongoose, { Document } from 'mongoose';
export interface IExpenseClaim extends Document {
    organizationId: mongoose.Types.ObjectId;
    employeeId: mongoose.Types.ObjectId;
    amount: number;
    category: string;
    description: string;
    receipts: string[];
    status: 'pending' | 'approved' | 'rejected' | 'reimbursed';
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    remarks?: string;
    submittedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IExpenseClaim, {}, {}, {}, mongoose.Document<unknown, {}, IExpenseClaim, {}, {}> & IExpenseClaim & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=ExpenseClaim.d.ts.map