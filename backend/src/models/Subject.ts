import mongoose, { Schema, Document, Types } from 'mongoose';

export enum SubjectType {
  THEORY = 'THEORY',
  LAB = 'LAB',
  SEMINAR = 'SEMINAR',
  TUTORIAL = 'TUTORIAL',
}

export interface ISubject extends Document {
  code: string;
  name: string;
  credits: number;
  hoursPerWeek: number;
  type: SubjectType;
  department: string;
  semester: number;
  eligibleFaculty: Types.ObjectId[];
  isActive: boolean;
}

const SubjectSchema: Schema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    name: { type: String, required: true },
    credits: { type: Number, required: true },
    hoursPerWeek: { type: Number, required: true },
    type: { type: String, enum: Object.values(SubjectType), required: true },
    department: { type: String, required: true },
    semester: { type: Number, required: true },
    eligibleFaculty: [{ type: Schema.Types.ObjectId, ref: 'Faculty' }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Subject || mongoose.model<ISubject>('Subject', SubjectSchema);
