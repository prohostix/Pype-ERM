import mongoose, { Document } from 'mongoose';
export interface IAdmissionSession extends Document {
    organizationId: mongoose.Types.ObjectId;
    subDepartmentId: mongoose.Types.ObjectId;
    name: string;
    startDate: Date;
    endDate: Date;
    examDate?: Date;
    status: 'pending' | 'approved' | 'active' | 'closed';
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IAdmissionSession, {}, {}, {}, mongoose.Document<unknown, {}, IAdmissionSession, {}, {}> & IAdmissionSession & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=AdmissionSession.d.ts.map