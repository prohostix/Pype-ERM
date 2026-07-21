import mongoose, { Document } from 'mongoose';
export interface IPaymentEntry extends Document {
    organizationId: mongoose.Types.ObjectId;
    invoiceId: mongoose.Types.ObjectId;
    amount: number;
    method: 'cash' | 'cheque' | 'bank_transfer' | 'upi' | 'card';
    referenceNo?: string;
    receivedBy: mongoose.Types.ObjectId;
    receivedAt: Date;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IPaymentEntry, {}, {}, {}, mongoose.Document<unknown, {}, IPaymentEntry, {}, {}> & IPaymentEntry & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=PaymentEntry.d.ts.map