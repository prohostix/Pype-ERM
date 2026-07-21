import mongoose, { Document } from 'mongoose';
export interface IVacancy extends Document {
    organizationId: mongoose.Types.ObjectId;
    departmentId: mongoose.Types.ObjectId;
    designation: string;
    count: number;
    filled: number;
    status: 'open' | 'closed';
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IVacancy, {}, {}, {}, mongoose.Document<unknown, {}, IVacancy, {}, {}> & IVacancy & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Vacancy.d.ts.map