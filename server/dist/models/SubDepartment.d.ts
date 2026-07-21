import mongoose, { Document } from 'mongoose';
export interface ISubDepartment extends Document {
    organizationId: mongoose.Types.ObjectId;
    name: 'OpenSchool' | 'Online' | 'Skill' | 'BVoc';
    parentDeptId: mongoose.Types.ObjectId;
    features: string[];
    assignedUniversities?: mongoose.Types.ObjectId[];
    assignedPrograms?: mongoose.Types.ObjectId[];
    assignedCenters?: mongoose.Types.ObjectId[];
    status: 'active' | 'inactive';
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const SubDepartment: mongoose.Model<ISubDepartment, {}, {}, {}, mongoose.Document<unknown, {}, ISubDepartment, {}, {}> & ISubDepartment & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default SubDepartment;
//# sourceMappingURL=SubDepartment.d.ts.map