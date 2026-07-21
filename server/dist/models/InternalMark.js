import mongoose, { Schema } from 'mongoose';
const internalMarkSchema = new Schema({
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    studentId: {
        type: Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    subjectId: { type: Schema.Types.ObjectId, required: true },
    marks: { type: Number, required: true },
    maxMarks: { type: Number, required: true },
    examType: {
        type: String,
        enum: ['internal', 'practical', 'assignment'],
        required: true
    },
    enteredBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    enteredAt: { type: Date, default: Date.now },
}, { timestamps: true });
internalMarkSchema.index({ studentId: 1 });
internalMarkSchema.index({ organizationId: 1 });
export default mongoose.model('InternalMark', internalMarkSchema);
//# sourceMappingURL=InternalMark.js.map