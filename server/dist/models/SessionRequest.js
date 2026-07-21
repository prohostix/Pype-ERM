import mongoose, { Schema } from 'mongoose';
const sessionRequestSchema = new Schema({
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true,
    },
    centerId: {
        type: Schema.Types.ObjectId,
        ref: 'StudyCenter',
        required: true,
        index: true,
    },
    centerName: {
        type: String,
        required: true,
    },
    requestedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    sessionDetails: {
        name: { type: String, required: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        programId: { type: Schema.Types.ObjectId, ref: 'Program', required: true },
        universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true },
        capacity: { type: Number, required: true },
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
        index: true,
    },
    approvedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    approvedAt: Date,
    rejectionReason: String,
}, {
    timestamps: true,
});
sessionRequestSchema.index({ centerId: 1, status: 1 });
sessionRequestSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
const SessionRequest = mongoose.model('SessionRequest', sessionRequestSchema);
export default SessionRequest;
//# sourceMappingURL=SessionRequest.js.map