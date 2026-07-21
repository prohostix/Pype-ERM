import mongoose, { Schema } from 'mongoose';
const universitySchema = new Schema({
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    subDepartmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    address: { type: String },
    contact: { type: String },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
}, { timestamps: true });
universitySchema.index({ organizationId: 1 });
universitySchema.index({ code: 1 });
export default mongoose.model('University', universitySchema);
//# sourceMappingURL=University.js.map