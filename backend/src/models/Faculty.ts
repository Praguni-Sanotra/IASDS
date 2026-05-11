import mongoose, { Schema, Document, Types } from 'mongoose';

export enum DayOfWeek {
  MON = 'MON',
  TUE = 'TUE',
  WED = 'WED',
  THU = 'THU',
  FRI = 'FRI',
  SAT = 'SAT',
}

export interface IFaculty extends Document {
  userId: Types.ObjectId;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  phone?: string;
  subjectsTaught: Array<{
    subjectId: Types.ObjectId;
    isPrimary: boolean;
  }>;
  availability: Array<{
    day: DayOfWeek;
    availableSlots: number[];
  }>;
  maxHoursPerWeek: number;
  currentAssignedHours: number;
  isActive: boolean;
}

const FacultySchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    employeeId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    department: { type: String, required: true },
    phone: { type: String },
    subjectsTaught: [
      {
        subjectId: { type: Schema.Types.ObjectId, ref: 'Subject' },
        isPrimary: { type: Boolean, default: false },
      },
    ],
    availability: [
      {
        day: { type: String, enum: Object.values(DayOfWeek), required: true },
        availableSlots: [{ type: Number }], // array of slot numbers e.g. [1, 2, 3]
      },
    ],
    maxHoursPerWeek: { type: Number, required: true, default: 40 },
    currentAssignedHours: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Faculty || mongoose.model<IFaculty>('Faculty', FacultySchema);
