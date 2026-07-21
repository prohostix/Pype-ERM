import mongoose, { Schema } from 'mongoose';
const referralLinkSchema = new Schema({
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true,
    },
    employeeId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    employeeName: {
        type: String,
        required: true,
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    fullUrl: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active',
    },
    metrics: {
        centersReferred: { type: Number, default: 0 },
        studentsReferred: { type: Number, default: 0 },
        revenueGenerated: { type: Number, default: 0 },
        lastUsed: Date,
    },
}, {
    timestamps: true,
});
referralLinkSchema.index({ employeeId: 1, slug: 1 });
const ReferralLink = mongoose.model('ReferralLink', referralLinkSchema);
export default ReferralLink;
//# sourceMappingURL=ReferralLink.js.map