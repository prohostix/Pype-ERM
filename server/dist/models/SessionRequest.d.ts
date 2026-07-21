import mongoose, { Document } from 'mongoose';
export interface ISessionRequest extends Document {
    organizationId: mongoose.Types.ObjectId;
    centerId: mongoose.Types.ObjectId;
    centerName: string;
    requestedBy: mongoose.Types.ObjectId;
    sessionDetails: {
        name: string;
        startDate: Date;
        endDate: Date;
        programId: mongoose.Types.ObjectId;
        universityId: mongoose.Types.ObjectId;
        capacity: number;
    };
    status: 'pending' | 'approved' | 'rejected';
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    rejectionReason?: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const SessionRequest: mongoose.Model<ISessionRequest, {}, {}, {}, mongoose.Document<unknown, {}, ISessionRequest, {}, {}> & ISessionRequest & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default SessionRequest;
//# sourceMappingURL=SessionRequest.d.ts.map