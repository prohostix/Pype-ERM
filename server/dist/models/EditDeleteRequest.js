import mongoose, { Schema } from 'mongoose';
const editDeleteRequestSchema = new Schema({
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true,
    },
    requesterId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    requesterName: {
        type: String,
        required: true,
    },
    targetCollection: {
        type: String,
        required: true,
    },
    targetId: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    requestType: {
        type: String,
        enum: ['edit', 'delete'],
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    proposedChanges: Schema.Types.Mixed,
    currentData: Schema.Types.Mixed,
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
        index: true,
    },
    respondedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    respondedAt: Date,
    responseRemarks: String,
}, {
    timestamps: true,
});
// Indexes
editDeleteRequestSchema.index({ requesterId: 1, status: 1 });
editDeleteRequestSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
editDeleteRequestSchema.index({ targetCollection: 1, targetId: 1 });
const EditDeleteRequest = mongoose.model('EditDeleteRequest', editDeleteRequestSchema);
export default EditDeleteRequest;
//# sourceMappingURL=EditDeleteRequest.js.map