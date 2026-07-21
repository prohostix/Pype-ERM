import mongoose, { Schema } from 'mongoose';
const hrSettingsSchema = new Schema({
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        unique: true
    },
    officeHours: {
        checkInTime: { type: String, required: true, default: '09:00' },
        checkOutTime: { type: String, required: true, default: '18:00' },
        graceMinutes: { type: Number, default: 15 },
        workingDays: {
            type: [String],
            default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        },
    },
    latePolicy: {
        maxLateMinutesPerMonth: { type: Number, default: 60 },
        deductionPerExtraMinute: { type: Number, default: 0 },
        warningThreshold: { type: Number, default: 45 },
    },
    location: {
        officeLatitude: { type: Number, required: true },
        officeLongitude: { type: Number, required: true },
        allowedRadius: { type: Number, default: 100 }, // 100 meters
        requireLocationForCheckIn: { type: Boolean, default: true },
    },
}, { timestamps: true });
hrSettingsSchema.index({ organizationId: 1 });
export default mongoose.model('HRSettings', hrSettingsSchema);
//# sourceMappingURL=HRSettings.js.map