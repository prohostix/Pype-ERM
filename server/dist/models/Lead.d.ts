import mongoose, { Document } from 'mongoose';
export interface ILead extends Document {
    organizationId: mongoose.Types.ObjectId;
    centerName: string;
    contactName: string;
    email: string;
    phone: string;
    address: string;
    source: string;
    referredBy?: mongoose.Types.ObjectId;
    status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'converted' | 'lost';
    notes: string;
    convertedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<ILead, {}, {}, {}, mongoose.Document<unknown, {}, ILead, {}, {}> & ILead & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Lead.d.ts.map