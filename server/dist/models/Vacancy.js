import mongoose, { Schema } from 'mongoose';
const vacancySchema = new Schema({
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
    designation: { type: String, required: true },
    count: { type: Number, required: true, min: 1 },
    filled: { type: Number, default: 0, min: 0 },
    status: {
        type: String,
        enum: ['open', 'closed'],
        default: 'open'
    },
}, { timestamps: true });
vacancySchema.index({ organizationId: 1, departmentId: 1 });
vacancySchema.index({ status: 1 });
export default mongoose.model('Vacancy', vacancySchema);
//# sourceMappingURL=Vacancy.js.map