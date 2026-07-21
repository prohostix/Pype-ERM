import mongoose, { Document } from 'mongoose';
export interface IAttendance extends Document {
    employeeId: mongoose.Types.ObjectId;
    organizationId: mongoose.Types.ObjectId;
    date: Date;
    status: 'present' | 'absent' | 'half_day' | 'leave' | 'late';
    checkIn?: Date;
    checkOut?: Date;
    checkInLocation?: {
        latitude: number;
        longitude: number;
        address?: string;
    };
    checkOutLocation?: {
        latitude: number;
        longitude: number;
        address?: string;
    };
    isLate?: boolean;
    lateMinutes?: number;
    workingHours?: number;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IAttendance, {}, {}, {}, mongoose.Document<unknown, {}, IAttendance, {}, {}> & IAttendance & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Attendance.d.ts.map