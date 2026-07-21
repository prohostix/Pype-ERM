import mongoose, { Document } from 'mongoose';
export interface IHRSettings extends Document {
    organizationId: mongoose.Types.ObjectId;
    officeHours: {
        checkInTime: string;
        checkOutTime: string;
        graceMinutes: number;
        workingDays: string[];
    };
    latePolicy: {
        maxLateMinutesPerMonth: number;
        deductionPerExtraMinute?: number;
        warningThreshold?: number;
    };
    location: {
        officeLatitude: number;
        officeLongitude: number;
        allowedRadius: number;
        requireLocationForCheckIn: boolean;
    };
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IHRSettings, {}, {}, {}, mongoose.Document<unknown, {}, IHRSettings, {}, {}> & IHRSettings & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=HRSettings.d.ts.map