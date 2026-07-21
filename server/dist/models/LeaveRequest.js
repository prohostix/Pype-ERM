import mongoose, { Schema } from 'mongoose';
const leaveRequestSchema = new Schema({
    employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    departmentId: {
        type: Schema.Types.ObjectId,
        ref: 'Department',
        required: true
    },
    type: {
        type: String,
        enum: ['sick', 'casual', 'earned', 'unpaid'],
        required: true
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, required: true },
    status: {
        type: String,
        enum: ['pending', 'dept_approved', 'approved', 'rejected'],
        default: 'pending'
    },
    deptAdminRemarks: { type: String },
    hrRemarks: { type: String },
    deptApprovedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    hrApprovedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    appliedAt: { type: Date, default: Date.now },
}, { timestamps: true });
leaveRequestSchema.index({ employeeId: 1, status: 1 });
leaveRequestSchema.index({ organizationId: 1, status: 1 });
export default mongoose.model('LeaveRequest', leaveRequestSchema);
//# sourceMappingURL=LeaveRequest.js.map