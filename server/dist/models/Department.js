import mongoose, { Schema } from 'mongoose';
const departmentSchema = new Schema({
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    name: { type: String, required: true, trim: true },
    type: {
        type: String,
        enum: ['operations', 'finance', 'hr', 'sales', 'ceo', 'org_admin', 'study_center', 'staff', 'custom'],
        required: true
    },
    subType: {
        type: String,
        enum: ['openschool', 'online', 'skill', 'bvoc']
    },
    parentDepartmentId: {
        type: Schema.Types.ObjectId,
        ref: 'Department',
        default: null
    },
    managerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    assistantManagerIds: [{
            type: Schema.Types.ObjectId,
            ref: 'User'
        }],
    features: [{ type: String }],
    permissions: [{
            name: String,
            module: String,
            actions: [String],
        }],
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
}, { timestamps: true });
departmentSchema.index({ organizationId: 1, type: 1 });
departmentSchema.index({ organizationId: 1, status: 1 });
departmentSchema.index({ parentDepartmentId: 1 });
departmentSchema.index({ managerId: 1 });
export default mongoose.model('Department', departmentSchema);
//# sourceMappingURL=Department.js.map