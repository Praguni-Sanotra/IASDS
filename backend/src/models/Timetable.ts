import mongoose, { Schema, Document, Types } from 'mongoose';
import { DayOfWeek } from './Faculty';

export enum TimetableStatus {
  DRAFT = 'DRAFT',
  PENDING_HOD_APPROVAL = 'PENDING_HOD_APPROVAL',
  APPROVED_BY_HOD = 'APPROVED_BY_HOD',
  REJECTED_BY_HOD = 'REJECTED_BY_HOD',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}


export interface ITimetableSlot {
  day: DayOfWeek;
  period: number;
  startTime: string;
  endTime: string;
  subjectId: Types.ObjectId;
  facultyId: Types.ObjectId;
  roomId: Types.ObjectId;
  batch: string;
  section: string;
  isLab: boolean;
}

export interface ITimetable extends Document {
  semesterId: string;
  academicYear: string;
  generatedAt: Date;
  generatedBy?: Types.ObjectId;
  status: TimetableStatus;
  algorithm: string;
  solvingTimeMs: number;
  slots: ITimetableSlot[];
  conflictCount: number;
  fairnessScore: number;
}

const SlotSchema: Schema = new Schema(
  {
    day: { type: String, enum: Object.values(DayOfWeek), required: true },
    period: { type: Number, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    batch: { type: String },
    section: { type: String },
    isLab: { type: Boolean, default: false },
  },
  { _id: true }
);

const TimetableSchema: Schema = new Schema(
  {
    semesterId: { type: String, required: true },
    academicYear: { type: String, required: true },
    generatedAt: { type: Date, default: Date.now },
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: Object.values(TimetableStatus), default: TimetableStatus.DRAFT },
    algorithm: { type: String, default: 'CSP_SOLVER' },
    solvingTimeMs: { type: Number },
    slots: [SlotSchema],
    conflictCount: { type: Number, default: 0 },
    fairnessScore: { type: Number, default: 100 },
  },
  { timestamps: true }
);

export default mongoose.models.Timetable || mongoose.model<ITimetable>('Timetable', TimetableSchema);
