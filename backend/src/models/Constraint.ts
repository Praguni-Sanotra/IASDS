import mongoose, { Schema, Document } from 'mongoose';

export enum ConstraintType {
  HARD = 'HARD',
  SOFT = 'SOFT',
}

export interface IConstraint extends Document {
  name: string;
  type: ConstraintType;
  category: string;
  description: string;
  isEnabled: boolean;
  config: Record<string, any>;
  priority: number;
}

const ConstraintSchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    type: { type: String, enum: Object.values(ConstraintType), required: true },
    category: { type: String, required: true }, // e.g., 'FACULTY', 'ROOM', 'SUBJECT'
    description: { type: String },
    isEnabled: { type: Boolean, default: true },
    config: { type: Schema.Types.Mixed, default: {} }, // Arbitrary JSON for constraint specific logic
    priority: { type: Number, default: 0 }, // Useful for soft constraints
  },
  { timestamps: true }
);

export default mongoose.models.Constraint || mongoose.model<IConstraint>('Constraint', ConstraintSchema);
