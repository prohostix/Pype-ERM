import mongoose, { Document } from 'mongoose';
export interface IUser extends Document {
    userId: string;
    organizationId: mongoose.Types.ObjectId;
    departmentId?: mongoose.Types.ObjectId;
    subDepartmentId?: mongoose.Types.ObjectId;
    ceoPanelId?: mongoose.Types.ObjectId;
    email: string;
    password: string;
    name: string;
    role: string;
    avatar?: string;
    phone?: string;
    designation?: string;
    reportingTo?: mongoose.Types.ObjectId;
    status: 'active' | 'inactive' | 'on_leave';
    lastLogin?: Date;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}
declare const _default: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, {}> & IUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=User.d.ts.map