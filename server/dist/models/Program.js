import mongoose, { Schema } from 'mongoose';
const programSchema = new Schema({
    universityId: {
        type: Schema.Types.ObjectId,
        ref: 'University',
        required: true
    },
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    name: { type: String, required: true },
    code: { type: String, required: true },
    duration: { type: Number, required: true }, // in months
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
}, { timestamps: true });
programSchema.index({ universityId: 1 });
programSchema.index({ organizationId: 1 });
export default mongoose.model('Program', programSchema);
//# sourceMappingURL=Program.js.map