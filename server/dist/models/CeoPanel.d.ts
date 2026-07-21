import mongoose, { Document } from 'mongoose';
export interface ICeoPanel extends Document {
    organizationId: mongoose.Types.ObjectId;
    assignedUserId: mongoose.Types.ObjectId;
    name: string;
    dataScope: string[];
    status: 'active' | 'inactive';
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const CeoPanel: mongoose.Model<ICeoPanel, {}, {}, {}, mongoose.Document<unknown, {}, ICeoPanel, {}, {}> & ICeoPanel & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default CeoPanel;
//# sourceMappingURL=CeoPanel.d.ts.map