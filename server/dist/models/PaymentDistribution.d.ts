import mongoose, { Document } from 'mongoose';
export interface IPaymentDistribution extends Document {
    organizationId: mongoose.Types.ObjectId;
    name: string;
    partnerType: 'university' | 'edtech' | 'coordinator' | 'other';
    partnerId?: mongoose.Types.ObjectId;
    partnerName: string;
    distributionRules: {
        feeType: string;
        percentage: number;
        fixedAmount?: number;
        priority: number;
    }[];
    status: 'active' | 'inactive';
    effectiveFrom: Date;
    effectiveTo?: Date;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const PaymentDistribution: mongoose.Model<IPaymentDistribution, {}, {}, {}, mongoose.Document<unknown, {}, IPaymentDistribution, {}, {}> & IPaymentDistribution & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default PaymentDistribution;
//# sourceMappingURL=PaymentDistribution.d.ts.map