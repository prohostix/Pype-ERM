import mongoose, { Document } from 'mongoose';
export interface IAnnouncement extends Document {
    organizationId: mongoose.Types.ObjectId;
    departmentId?: mongoose.Types.ObjectId;
    title: string;
    content: string;
    type: 'general' | 'hr' | 'ops' | 'finance' | 'sales';
    priority: 'low' | 'medium' | 'high';
    postedBy: mongoose.Types.ObjectId;
    postedAt: Date;
    expiresAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IAnnouncement, {}, {}, {}, mongoose.Document<unknown, {}, IAnnouncement, {}, {}> & IAnnouncement & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Announcement.d.ts.map