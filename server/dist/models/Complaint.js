import mongoose, { Schema } from 'mongoose';
const complaintSchema = new Schema({
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    employeeId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    status: {
        type: String,
        enum: ['open', 'in_progress', 'resolved', 'closed'],
        default: 'open'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    submittedAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date },
    resolution: { type: String },
}, { timestamps: true });
complaintSchema.index({ organizationId: 1, status: 1 });
complaintSchema.index({ employeeId: 1 });
export default mongoose.model('Complaint', complaintSchema);
//# sourceMappingURL=Complaint.js.map