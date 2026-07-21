import mongoose, { Document } from 'mongoose';
export interface ILicense extends Document {
    name: string;
    type: 'basic' | 'premium' | 'enterprise';
    features: string[];
    maxUsers: number;
    maxStorage: number;
    durationMonths: number;
    price: number;
    status: 'active' | 'inactive';
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<ILicense, {}, {}, {}, mongoose.Document<unknown, {}, ILicense, {}, {}> & ILicense & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=License.d.ts.map