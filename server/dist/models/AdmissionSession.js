import mongoose, { Schema } from 'mongoose';
const admissionSessionSchema = new Schema({
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    subDepartmentId: {
        type: Schema.Types.ObjectId,
        ref: 'Department',
        required: true
    },
    name: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    examDate: { type: Date },
    status: {
        type: String,
        enum: ['pending', 'approved', 'active', 'closed'],
        default: 'pending'
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
}, { timestamps: true });
admissionSessionSchema.index({ organizationId: 1, status: 1 });
admissionSessionSchema.index({ subDepartmentId: 1 });
export default mongoose.model('AdmissionSession', admissionSessionSchema);
//# sourceMappingURL=AdmissionSession.js.map