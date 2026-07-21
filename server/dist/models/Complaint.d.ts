import mongoose, { Document } from 'mongoose';
export interface IComplaint extends Document {
    organizationId: mongoose.Types.ObjectId;
    employeeId: mongoose.Types.ObjectId;
    subject: string;
    description: string;
    category: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high';
    submittedAt: Date;
    resolvedAt?: Date;
    resolution?: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IComplaint, {}, {}, {}, mongoose.Document<unknown, {}, IComplaint, {}, {}> & IComplaint & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Complaint.d.ts.map