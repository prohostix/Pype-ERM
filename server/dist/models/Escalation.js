import mongoose, { Schema } from 'mongoose';
const escalationSchema = new Schema({
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    type: {
        type: String,
        enum: ['task_overdue', 'approval_delay', 'compliance', 'credential_reveal'],
        required: true
    },
    entityId: { type: Schema.Types.ObjectId, required: true },
    entityType: { type: String, required: true },
    raisedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    raisedAt: { type: Date, default: Date.now },
    currentLevel: { type: Number, default: 1 },
    maxLevel: { type: Number, default: 3 },
    status: {
        type: String,
        enum: ['active', 'resolved'],
        default: 'active'
    },
    description: { type: String, required: true },
    impact: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    chain: [{
            level: { type: Number, required: true },
            role: { type: String, required: true },
            userId: { type: Schema.Types.ObjectId, ref: 'User' },
            action: { type: String },
            actionAt: { type: Date },
            remarks: { type: String },
        }],
}, { timestamps: true });
escalationSchema.index({ organizationId: 1, status: 1 });
escalationSchema.index({ entityId: 1, entityType: 1 });
export default mongoose.model('Escalation', escalationSchema);
//# sourceMappingURL=Escalation.js.map