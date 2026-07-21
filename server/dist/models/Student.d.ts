import mongoose, { Document } from 'mongoose';
export interface IStudent extends Document {
    centerId: mongoose.Types.ObjectId;
    organizationId: mongoose.Types.ObjectId;
    enrollmentNo: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    programId: mongoose.Types.ObjectId;
    sessionId?: mongoose.Types.ObjectId;
    status: 'pending' | 'active' | 'inactive' | 'completed';
    joinDate: Date;
    reregStatus?: {
        semester: number;
        status: 'pending' | 'completed' | 'carry_forward';
        feePaid: boolean;
        completedAt?: Date;
    };
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IStudent, {}, {}, {}, mongoose.Document<unknown, {}, IStudent, {}, {}> & IStudent & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Student.d.ts.map