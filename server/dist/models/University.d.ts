import mongoose, { Document } from 'mongoose';
export interface IUniversity extends Document {
    organizationId: mongoose.Types.ObjectId;
    subDepartmentId?: mongoose.Types.ObjectId;
    name: string;
    code: string;
    address?: string;
    contact?: string;
    status: 'active' | 'inactive';
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IUniversity, {}, {}, {}, mongoose.Document<unknown, {}, IUniversity, {}, {}> & IUniversity & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=University.d.ts.map