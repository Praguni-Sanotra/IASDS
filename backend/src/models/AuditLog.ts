import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  action: string;
  entity: string;
  entityId?: string;
  performedBy?: Types.ObjectId;
  ipAddress?: string;
  details: Record<string, any>;
  timestamp: Date;
}

const AuditLogSchema: Schema = new Schema(
  {
    action: { type: String, required: true }, // e.g., 'CREATE', 'UPDATE', 'DELETE', 'GENERATE'
    entity: { type: String, required: true }, // e.g., 'USER', 'TIMETABLE', 'FACULTY'
    entityId: { type: String },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    ipAddress: { type: String },
    details: { type: Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// We usually don't need to update audit logs, so no timestamps option
export default mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
