import mongoose, { Document } from 'mongoose';
export interface IFeeStructure extends Document {
    programId: mongoose.Types.ObjectId;
    organizationId: mongoose.Types.ObjectId;
    registrationFee: number;
    tuitionFee: number;
    examFee: number;
    otherCharges: Map<string, number>;
    gstPercentage: number;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IFeeStructure, {}, {}, {}, mongoose.Document<unknown, {}, IFeeStructure, {}, {}> & IFeeStructure & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=FeeStructure.d.ts.map