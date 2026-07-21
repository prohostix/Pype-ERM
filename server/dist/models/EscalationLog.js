import mongoose, { Schema } from 'mongoose';
const escalationLogSchema = new Schema({
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true,
    },
    taskId: {
        type: Schema.Types.ObjectId,
        ref: 'Task',
        required: true,
        index: true,
    },
    employeeId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    deptAdminId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    ceoId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    escalatedAt: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        enum: ['pending', 'resolved', 'reassigned', 'extended', 'justified'],
        default: 'pending',
        index: true,
    },
    chain: [
        {
            level: {
                type: String,
                enum: ['employee', 'dept_admin', 'ceo'],
                required: true,
            },
            userId: {
                type: Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
            action: {
                type: String,
                required: true,
            },
            timestamp: {
                type: Date,
                default: Date.now,
            },
            remarks: String,
        },
    ],
    resolution: String,
    resolvedAt: Date,
    resolvedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    gracePeriodEnd: {
        type: Date,
        required: true,
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium',
    },
}, {
    timestamps: true,
});
// Indexes for performance
escalationLogSchema.index({ taskId: 1, status: 1 });
escalationLogSchema.index({ escalatedAt: -1 });
escalationLogSchema.index({ organizationId: 1, status: 1, priority: -1 });
const EscalationLog = mongoose.model('EscalationLog', escalationLogSchema);
export default EscalationLog;
//# sourceMappingURL=EscalationLog.js.map