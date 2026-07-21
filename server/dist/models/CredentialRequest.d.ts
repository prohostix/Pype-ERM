import mongoose, { Document } from 'mongoose';
export interface ICredentialRequest extends Document {
    organizationId: mongoose.Types.ObjectId;
    requesterId: mongoose.Types.ObjectId;
    requesterName: string;
    requesterRole: string;
    ipAddress: string;
    targetCredential: string;
    targetCollection: string;
    targetId: mongoose.Types.ObjectId;
    remarks: string;
    status: 'pending' | 'approved' | 'rejected';
    respondedBy?: mongoose.Types.ObjectId;
    respondedAt?: Date;
    responseRemarks?: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const CredentialRequest: mongoose.Model<ICredentialRequest, {}, {}, {}, mongoose.Document<unknown, {}, ICredentialRequest, {}, {}> & ICredentialRequest & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default CredentialRequest;
//# sourceMappingURL=CredentialRequest.d.ts.map