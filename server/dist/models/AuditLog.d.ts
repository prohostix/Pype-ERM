import mongoose, { Document } from 'mongoose';
export interface IAuditLog extends Document {
    organizationId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    action: string;
    entityType: string;
    entityId: mongoose.Types.ObjectId;
    oldValue?: any;
    newValue?: any;
    ipAddress?: string;
    timestamp: Date;
}
declare const _default: mongoose.Model<IAuditLog, {}, {}, {}, mongoose.Document<unknown, {}, IAuditLog, {}, {}> & IAuditLog & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=AuditLog.d.ts.map