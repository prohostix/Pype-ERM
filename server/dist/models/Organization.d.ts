import mongoose, { Document } from 'mongoose';
export interface IOrganization extends Document {
    name: string;
    email: string;
    phone: string;
    address: string;
    logo?: string;
    status: 'active' | 'inactive' | 'suspended';
    licenseId?: mongoose.Types.ObjectId;
    licenseExpiry?: Date;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IOrganization, {}, {}, {}, mongoose.Document<unknown, {}, IOrganization, {}, {}> & IOrganization & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Organization.d.ts.map