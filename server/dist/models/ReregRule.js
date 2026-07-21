import mongoose, { Schema } from 'mongoose';
const reregRuleSchema = new Schema({
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        unique: true,
        index: true,
    },
    carryForwardEnabled: {
        type: Boolean,
        default: true,
    },
    autoApproveThreshold: {
        type: Number,
        default: 0,
        comment: 'Auto-approve if fees paid >= this amount',
    },
    notifyFinanceOnMiss: {
        type: Boolean,
        default: true,
    },
    gracePeriodDays: {
        type: Number,
        default: 7,
    },
    penaltyAmount: Number,
    escalationRules: [
        {
            missedCycles: { type: Number, required: true },
            action: {
                type: String,
                enum: ['notify', 'block', 'escalate'],
                required: true,
            },
            notifyRoles: [String],
        },
    ],
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, {
    timestamps: true,
});
const ReregRule = mongoose.model('ReregRule', reregRuleSchema);
export default ReregRule;
//# sourceMappingURL=ReregRule.js.map