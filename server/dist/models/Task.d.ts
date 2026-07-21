import mongoose, { Document } from 'mongoose';
export interface ITask extends Document {
    organizationId: mongoose.Types.ObjectId;
    departmentId: mongoose.Types.ObjectId;
    title: string;
    description: string;
    assignedTo: mongoose.Types.ObjectId;
    assignedBy: mongoose.Types.ObjectId;
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: 'pending' | 'in_progress' | 'completed' | 'overdue';
    deadline: Date;
    completedAt?: Date;
    evidence?: string[];
    remarks?: string;
    escalatedTo?: mongoose.Types.ObjectId;
    escalatedAt?: Date;
    escalationStatus: 'none' | 'overdue_employee' | 'escalated_dept' | 'escalated_ceo';
    gracePeriodEnd?: Date;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<ITask, {}, {}, {}, mongoose.Document<unknown, {}, ITask, {}, {}> & ITask & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Task.d.ts.map