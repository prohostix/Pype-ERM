import mongoose, { Document } from 'mongoose';
export interface IEditDeleteRequest extends Document {
    organizationId: mongoose.Types.ObjectId;
    requesterId: mongoose.Types.ObjectId;
    requesterName: string;
    targetCollection: string;
    targetId: mongoose.Types.ObjectId;
    requestType: 'edit' | 'delete';
    message: string;
    proposedChanges?: any;
    currentData?: any;
    status: 'pending' | 'approved' | 'rejected';
    respondedBy?: mongoose.Types.ObjectId;
    respondedAt?: Date;
    responseRemarks?: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const EditDeleteRequest: mongoose.Model<IEditDeleteRequest, {}, {}, {}, mongoose.Document<unknown, {}, IEditDeleteRequest, {}, {}> & IEditDeleteRequest & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default EditDeleteRequest;
//# sourceMappingURL=EditDeleteRequest.d.ts.map