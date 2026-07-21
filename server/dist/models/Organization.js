import mongoose, { Schema } from 'mongoose';
const organizationSchema = new Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    logo: { type: String },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    },
    licenseId: { type: Schema.Types.ObjectId, ref: 'License' },
    licenseExpiry: { type: Date },
    metadata: { type: Schema.Types.Mixed },
}, { timestamps: true });
organizationSchema.index({ email: 1 });
organizationSchema.index({ status: 1 });
export default mongoose.model('Organization', organizationSchema);
//# sourceMappingURL=Organization.js.map