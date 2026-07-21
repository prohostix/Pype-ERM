import mongoose, { Document } from 'mongoose';
export interface IInvoice extends Document {
    organizationId: mongoose.Types.ObjectId;
    centerId: mongoose.Types.ObjectId;
    studentId?: mongoose.Types.ObjectId;
    invoiceNo: string;
    amount: number;
    tax: number;
    total: number;
    status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
    items: Array<{
        description: string;
        quantity: number;
        rate: number;
        amount: number;
    }>;
    dueDate?: Date;
    paidAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IInvoice, {}, {}, {}, mongoose.Document<unknown, {}, IInvoice, {}, {}> & IInvoice & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Invoice.d.ts.map