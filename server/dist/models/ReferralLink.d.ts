import mongoose, { Document } from 'mongoose';
export interface IReferralLink extends Document {
    organizationId: mongoose.Types.ObjectId;
    employeeId: mongoose.Types.ObjectId;
    employeeName: string;
    slug: string;
    fullUrl: string;
    status: 'active' | 'inactive';
    metrics: {
        centersReferred: number;
        studentsReferred: number;
        revenueGenerated: number;
        lastUsed?: Date;
    };
    createdAt: Date;
    updatedAt: Date;
}
declare const ReferralLink: mongoose.Model<IReferralLink, {}, {}, {}, mongoose.Document<unknown, {}, IReferralLink, {}, {}> & IReferralLink & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default ReferralLink;
//# sourceMappingURL=ReferralLink.d.ts.map