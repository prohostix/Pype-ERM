import mongoose, { Document } from 'mongoose';
export interface IEscalation extends Document {
    organizationId: mongoose.Types.ObjectId;
    type: 'task_overdue' | 'approval_delay' | 'compliance' | 'credential_reveal';
    entityId: mongoose.Types.ObjectId;
    entityType: string;
    raisedBy: mongoose.Types.ObjectId;
    raisedAt: Date;
    currentLevel: number;
    maxLevel: number;
    status: 'active' | 'resolved';
    description: string;
    impact: 'low' | 'medium' | 'high' | 'critical';
    chain: Array<{
        level: number;
        role: string;
        userId?: mongoose.Types.ObjectId;
        action?: string;
        actionAt?: Date;
        remarks?: string;
    }>;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IEscalation, {}, {}, {}, mongoose.Document<unknown, {}, IEscalation, {}, {}> & IEscalation & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Escalation.d.ts.map