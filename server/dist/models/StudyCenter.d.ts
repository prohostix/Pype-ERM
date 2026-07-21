import mongoose, { Document } from 'mongoose';
export interface IStudyCenter extends Document {
    organizationId: mongoose.Types.ObjectId;
    name: string;
    code: string;
    address: string;
    contact: string;
    email: string;
    status: 'pending' | 'active' | 'inactive' | 'suspended';
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    referredBy?: mongoose.Types.ObjectId;
    credentials?: {
        username: string;
        password: string;
        revealedAt?: Date;
        revealedBy?: mongoose.Types.ObjectId;
        ipAddress?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IStudyCenter, {}, {}, {}, mongoose.Document<unknown, {}, IStudyCenter, {}, {}> & IStudyCenter & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=StudyCenter.d.ts.map