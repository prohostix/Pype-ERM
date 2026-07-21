import mongoose, { Document } from 'mongoose';
interface IEscalationChain {
    level: 'employee' | 'dept_admin' | 'ceo';
    userId: mongoose.Types.ObjectId;
    action: string;
    timestamp: Date;
    remarks?: string;
}
export interface IEscalationLog extends Document {
    organizationId: mongoose.Types.ObjectId;
    taskId: mongoose.Types.ObjectId;
    employeeId: mongoose.Types.ObjectId;
    deptAdminId: mongoose.Types.ObjectId;
    ceoId?: mongoose.Types.ObjectId;
    escalatedAt: Date;
    status: 'pending' | 'resolved' | 'reassigned' | 'extended' | 'justified';
    chain: IEscalationChain[];
    resolution?: string;
    resolvedAt?: Date;
    resolvedBy?: mongoose.Types.ObjectId;
    gracePeriodEnd: Date;
    priority: 'low' | 'medium' | 'high' | 'critical';
    createdAt: Date;
    updatedAt: Date;
}
declare const EscalationLog: mongoose.Model<IEscalationLog, {}, {}, {}, mongoose.Document<unknown, {}, IEscalationLog, {}, {}> & IEscalationLog & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default EscalationLog;
//# sourceMappingURL=EscalationLog.d.ts.map