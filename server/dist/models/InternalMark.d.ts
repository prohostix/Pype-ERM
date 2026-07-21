import mongoose, { Document } from 'mongoose';
export interface IInternalMark extends Document {
    organizationId: mongoose.Types.ObjectId;
    studentId: mongoose.Types.ObjectId;
    subjectId: mongoose.Types.ObjectId;
    marks: number;
    maxMarks: number;
    examType: 'internal' | 'practical' | 'assignment';
    enteredBy: mongoose.Types.ObjectId;
    enteredAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IInternalMark, {}, {}, {}, mongoose.Document<unknown, {}, IInternalMark, {}, {}> & IInternalMark & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=InternalMark.d.ts.map