import mongoose, { Schema } from 'mongoose';
const employeeSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    employeeId: { type: String, required: true, unique: true },
    joinDate: { type: Date, required: true, default: Date.now },
    salary: { type: Number },
    vacancyId: { type: Schema.Types.ObjectId, ref: 'Vacancy' },
}, { timestamps: true });
employeeSchema.index({ organizationId: 1 });
employeeSchema.index({ employeeId: 1 });
export default mongoose.model('Employee', employeeSchema);
//# sourceMappingURL=Employee.js.map