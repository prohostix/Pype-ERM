import mongoose, { Schema } from 'mongoose';
const attendanceSchema = new Schema({
    employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    date: { type: Date, required: true },
    status: {
        type: String,
        enum: ['present', 'absent', 'half_day', 'leave', 'late'],
        required: true
    },
    checkIn: { type: Date },
    checkOut: { type: Date },
    checkInLocation: {
        latitude: { type: Number },
        longitude: { type: Number },
        address: { type: String },
    },
    checkOutLocation: {
        latitude: { type: Number },
        longitude: { type: Number },
        address: { type: String },
    },
    isLate: { type: Boolean, default: false },
    lateMinutes: { type: Number, default: 0 },
    workingHours: { type: Number, default: 0 },
    notes: { type: String },
}, { timestamps: true });
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ organizationId: 1, date: 1 });
attendanceSchema.index({ isLate: 1 });
export default mongoose.model('Attendance', attendanceSchema);
//# sourceMappingURL=Attendance.js.map