import mongoose, { Schema } from 'mongoose';
const invoiceSchema = new Schema({
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    centerId: {
        type: Schema.Types.ObjectId,
        ref: 'StudyCenter',
        required: true
    },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student' },
    invoiceNo: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    tax: { type: Number, required: true, default: 0 },
    total: { type: Number, required: true },
    status: {
        type: String,
        enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
        default: 'draft'
    },
    items: [{
            description: { type: String, required: true },
            quantity: { type: Number, required: true },
            rate: { type: Number, required: true },
            amount: { type: Number, required: true },
        }],
    dueDate: { type: Date },
    paidAt: { type: Date },
}, { timestamps: true });
invoiceSchema.index({ organizationId: 1, status: 1 });
invoiceSchema.index({ centerId: 1 });
invoiceSchema.index({ invoiceNo: 1 });
export default mongoose.model('Invoice', invoiceSchema);
//# sourceMappingURL=Invoice.js.map