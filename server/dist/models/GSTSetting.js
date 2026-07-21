import mongoose, { Schema } from 'mongoose';
const gstSettingSchema = new Schema({
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true,
    },
    feeType: {
        type: String,
        required: true,
    },
    gstPercentage: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
    },
    hsnCode: String,
    sacCode: String,
    applicableFrom: {
        type: Date,
        required: true,
    },
    applicableTo: Date,
    allowOverride: {
        type: Boolean,
        default: false,
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
gstSettingSchema.index({ organizationId: 1, feeType: 1, status: 1 });
gstSettingSchema.index({ applicableFrom: 1, applicableTo: 1 });
const GSTSetting = mongoose.model('GSTSetting', gstSettingSchema);
export default GSTSetting;
//# sourceMappingURL=GSTSetting.js.map