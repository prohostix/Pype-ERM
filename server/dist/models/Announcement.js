import mongoose, { Schema } from 'mongoose';
const announcementSchema = new Schema({
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    title: { type: String, required: true },
    content: { type: String, required: true },
    type: {
        type: String,
        enum: ['general', 'hr', 'ops', 'finance', 'sales'],
        default: 'general'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    postedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    postedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
}, { timestamps: true });
announcementSchema.index({ organizationId: 1, postedAt: -1 });
announcementSchema.index({ departmentId: 1 });
export default mongoose.model('Announcement', announcementSchema);
//# sourceMappingURL=Announcement.js.map