import mongoose, { Document } from 'mongoose';
export interface IIncentiveStructure extends Document {
    organizationId: mongoose.Types.ObjectId;
    name: string;
    targetType: 'revenue' | 'admissions' | 'centers' | 'custom';
    applicableTo: 'department' | 'center' | 'employee';
    tiers: {
        threshold: number;
        incentivePercentage?: number;
        fixedAmount?: number;
        description: string;
    }[];
    period: 'monthly' | 'quarterly' | 'yearly';
    status: 'draft' | 'active' | 'inactive';
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    effectiveFrom: Date;
    effectiveTo?: Date;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const IncentiveStructure: mongoose.Model<IIncentiveStructure, {}, {}, {}, mongoose.Document<unknown, {}, IIncentiveStructure, {}, {}> & IIncentiveStructure & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default IncentiveStructure;
//# sourceMappingURL=IncentiveStructure.d.ts.map