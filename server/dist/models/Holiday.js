import mongoose, { Schema } from 'mongoose';
const holidaySchema = new Schema({
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    name: { type: String, required: true },
    date: { type: Date, required: true },
    type: {
        type: String,
        enum: ['national', 'regional', 'company'],
        default: 'company'
    },
    description: { type: String },
}, { timestamps: true });
holidaySchema.index({ organizationId: 1, date: 1 });
export default mongoose.model('Holiday', holidaySchema);
//# sourceMappingURL=Holiday.js.map