import mongoose, { Document } from 'mongoose';
export interface IGSTSetting extends Document {
    organizationId: mongoose.Types.ObjectId;
    feeType: string;
    gstPercentage: number;
    hsnCode?: string;
    sacCode?: string;
    applicableFrom: Date;
    applicableTo?: Date;
    allowOverride: boolean;
    status: 'active' | 'inactive';
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const GSTSetting: mongoose.Model<IGSTSetting, {}, {}, {}, mongoose.Document<unknown, {}, IGSTSetting, {}, {}> & IGSTSetting & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default GSTSetting;
//# sourceMappingURL=GSTSetting.d.ts.map