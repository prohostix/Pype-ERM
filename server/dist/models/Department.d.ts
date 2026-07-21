import mongoose, { Document } from 'mongoose';
export interface IDepartment extends Document {
    organizationId: mongoose.Types.ObjectId;
    name: string;
    type: 'operations' | 'finance' | 'hr' | 'sales' | 'ceo' | 'org_admin' | 'study_center' | 'staff' | 'custom';
    subType?: 'openschool' | 'online' | 'skill' | 'bvoc';
    parentDepartmentId?: mongoose.Types.ObjectId;
    managerId?: mongoose.Types.ObjectId;
    assistantManagerIds?: mongoose.Types.ObjectId[];
    features: string[];
    permissions: Array<{
        name: string;
        module: string;
        actions: string[];
    }>;
    status: 'active' | 'inactive';
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IDepartment, {}, {}, {}, mongoose.Document<unknown, {}, IDepartment, {}, {}> & IDepartment & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Department.d.ts.map