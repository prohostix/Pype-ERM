import mongoose, { Document } from 'mongoose';
export interface IProgram extends Document {
    universityId: mongoose.Types.ObjectId;
    organizationId: mongoose.Types.ObjectId;
    name: string;
    code: string;
    duration: number;
    status: 'active' | 'inactive';
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IProgram, {}, {}, {}, mongoose.Document<unknown, {}, IProgram, {}, {}> & IProgram & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Program.d.ts.map