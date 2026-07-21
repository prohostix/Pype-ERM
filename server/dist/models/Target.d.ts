import mongoose, { Document } from 'mongoose';
export interface ITarget extends Document {
    organizationId: mongoose.Types.ObjectId;
    departmentId?: mongoose.Types.ObjectId;
    employeeId?: mongoose.Types.ObjectId;
    centerId?: mongoose.Types.ObjectId;
    type: 'revenue' | 'students' | 'centers';
    period: string;
    target: number;
    achieved: number;
    incentive?: number;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<ITarget, {}, {}, {}, mongoose.Document<unknown, {}, ITarget, {}, {}> & ITarget & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Target.d.ts.map