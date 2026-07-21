import mongoose, { Schema } from 'mongoose';
const subDepartmentSchema = new Schema({
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true,
    },
    name: {
        type: String,
        enum: ['OpenSchool', 'Online', 'Skill', 'BVoc'],
        required: true,
    },
    parentDeptId: {
        type: Schema.Types.ObjectId,
        ref: 'Department',
        required: true,
        index: true,
    },
    features: {
        type: [String],
        default: [],
    },
    assignedUniversities: [
        {
            type: Schema.Types.ObjectId,
            ref: 'University',
        },
    ],
    assignedPrograms: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Program',
        },
    ],
    assignedCenters: [
        {
            type: Schema.Types.ObjectId,
            ref: 'StudyCenter',
        },
    ],
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
// Unique constraint: one sub-department name per organization
subDepartmentSchema.index({ organizationId: 1, name: 1 }, { unique: true });
const SubDepartment = mongoose.model('SubDepartment', subDepartmentSchema);
export default SubDepartment;
//# sourceMappingURL=SubDepartment.js.map