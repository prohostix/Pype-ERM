import mongoose, { Schema } from 'mongoose';
const studentSchema = new Schema({
    centerId: {
        type: Schema.Types.ObjectId,
        ref: 'StudyCenter',
        required: true
    },
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    enrollmentNo: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    programId: { type: Schema.Types.ObjectId, ref: 'Program', required: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'AdmissionSession' },
    status: {
        type: String,
        enum: ['pending', 'active', 'inactive', 'completed'],
        default: 'pending'
    },
    joinDate: { type: Date, default: Date.now },
    reregStatus: {
        semester: { type: Number },
        status: {
            type: String,
            enum: ['pending', 'completed', 'carry_forward']
        },
        feePaid: { type: Boolean, default: false },
        completedAt: { type: Date },
    },
}, { timestamps: true });
studentSchema.index({ organizationId: 1, status: 1 });
studentSchema.index({ centerId: 1 });
studentSchema.index({ enrollmentNo: 1 });
export default mongoose.model('Student', studentSchema);
//# sourceMappingURL=Student.js.map