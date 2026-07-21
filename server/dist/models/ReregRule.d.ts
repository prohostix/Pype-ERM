import mongoose, { Document } from 'mongoose';
export interface IReregRule extends Document {
    organizationId: mongoose.Types.ObjectId;
    carryForwardEnabled: boolean;
    autoApproveThreshold: number;
    notifyFinanceOnMiss: boolean;
    gracePeriodDays: number;
    penaltyAmount?: number;
    escalationRules: {
        missedCycles: number;
        action: 'notify' | 'block' | 'escalate';
        notifyRoles: string[];
    }[];
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const ReregRule: mongoose.Model<IReregRule, {}, {}, {}, mongoose.Document<unknown, {}, IReregRule, {}, {}> & IReregRule & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default ReregRule;
//# sourceMappingURL=ReregRule.d.ts.map