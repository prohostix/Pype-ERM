import mongoose, { Document } from 'mongoose';
export interface ILeaveRequest extends Document {
    employeeId: mongoose.Types.ObjectId;
    organizationId: mongoose.Types.ObjectId;
    departmentId: mongoose.Types.ObjectId;
    type: 'sick' | 'casual' | 'earned' | 'unpaid';
    startDate: Date;
    endDate: Date;
    reason: string;
    status: 'pending' | 'dept_approved' | 'approved' | 'rejected';
    deptAdminRemarks?: string;
    hrRemarks?: string;
    deptApprovedBy?: mongoose.Types.ObjectId;
    hrApprovedBy?: mongoose.Types.ObjectId;
    appliedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<ILeaveRequest, {}, {}, {}, mongoose.Document<unknown, {}, ILeaveRequest, {}, {}> & ILeaveRequest & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=LeaveRequest.d.ts.map