import mongoose, { Schema } from 'mongoose';
const studyCenterSchema = new Schema({
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    address: { type: String, required: true },
    contact: { type: String, required: true },
    email: { type: String, required: true },
    status: {
        type: String,
        enum: ['pending', 'active', 'inactive', 'suspended'],
        default: 'pending'
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    referredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    credentials: {
        username: { type: String },
        password: { type: String, select: false },
        revealedAt: { type: Date },
        revealedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        ipAddress: { type: String },
    },
}, { timestamps: true });
studyCenterSchema.index({ organizationId: 1, status: 1 });
studyCenterSchema.index({ code: 1 });
export default mongoose.model('StudyCenter', studyCenterSchema);
//# sourceMappingURL=StudyCenter.js.map