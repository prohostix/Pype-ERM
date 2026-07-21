import mongoose, { Schema } from 'mongoose';
const feeStructureSchema = new Schema({
    programId: {
        type: Schema.Types.ObjectId,
        ref: 'Program',
        required: true,
        unique: true
    },
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    registrationFee: { type: Number, required: true, default: 0 },
    tuitionFee: { type: Number, required: true, default: 0 },
    examFee: { type: Number, required: true, default: 0 },
    otherCharges: { type: Map, of: Number, default: {} },
    gstPercentage: { type: Number, required: true, default: 18 },
}, { timestamps: true });
feeStructureSchema.index({ programId: 1 });
feeStructureSchema.index({ organizationId: 1 });
export default mongoose.model('FeeStructure', feeStructureSchema);
//# sourceMappingURL=FeeStructure.js.map