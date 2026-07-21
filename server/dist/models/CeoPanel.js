import mongoose, { Schema } from 'mongoose';
const ceoPanelSchema = new Schema({
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true,
    },
    assignedUserId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    dataScope: {
        type: [String],
        default: ['all'],
        enum: ['all', 'operations', 'finance', 'hr', 'sales', 'specific_departments'],
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active',
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, {
    timestamps: true,
});
// Indexes
ceoPanelSchema.index({ organizationId: 1, status: 1 });
ceoPanelSchema.index({ assignedUserId: 1 });
const CeoPanel = mongoose.model('CeoPanel', ceoPanelSchema);
export default CeoPanel;
//# sourceMappingURL=CeoPanel.js.map