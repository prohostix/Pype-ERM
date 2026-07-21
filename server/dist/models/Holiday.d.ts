import mongoose, { Document } from 'mongoose';
export interface IHoliday extends Document {
    organizationId: mongoose.Types.ObjectId;
    name: string;
    date: Date;
    type: 'national' | 'regional' | 'company';
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IHoliday, {}, {}, {}, mongoose.Document<unknown, {}, IHoliday, {}, {}> & IHoliday & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Holiday.d.ts.map