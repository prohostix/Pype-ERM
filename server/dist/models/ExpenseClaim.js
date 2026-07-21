import mongoose, { Schema } from 'mongoose';
const expenseClaimSchema = new Schema({
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
    amount: { type: Number, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    receipts: [{ type: String }],
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'reimbursed'],
        default: 'pending'
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    remarks: { type: String },
    submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });
expenseClaimSchema.index({ organizationId: 1, status: 1 });
expenseClaimSchema.index({ employeeId: 1 });
export default mongoose.model('ExpenseClaim', expenseClaimSchema);
//# sourceMappingURL=ExpenseClaim.js.map