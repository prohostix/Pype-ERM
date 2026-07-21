import mongoose, { Schema } from 'mongoose';
const incentiveStructureSchema = new Schema({
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
    },
    targetType: {
        type: String,
        enum: ['revenue', 'admissions', 'centers', 'custom'],
        required: true,
    },
    applicableTo: {
        type: String,
        enum: ['department', 'center', 'employee'],
        required: true,
    },
    tiers: [
        {
            threshold: { type: Number, required: true },
            incentivePercentage: Number,
            fixedAmount: Number,
            description: { type: String, required: true },
        },
    ],
    period: {
        type: String,
        enum: ['monthly', 'quarterly', 'yearly'],
        required: true,
    },
    status: {
        type: String,
        enum: ['draft', 'active', 'inactive'],
        default: 'draft',
    },
    approvedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    approvedAt: Date,
    effectiveFrom: {
        type: Date,
        required: true,
    },
    effectiveTo: Date,
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, {
    timestamps: true,
});
incentiveStructureSchema.index({ organizationId: 1, status: 1 });
incentiveStructureSchema.index({ effectiveFrom: 1, effectiveTo: 1 });
const IncentiveStructure = mongoose.model('IncentiveStructure', incentiveStructureSchema);
export default IncentiveStructure;
//# sourceMappingURL=IncentiveStructure.js.map