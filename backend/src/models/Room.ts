import mongoose, { Schema, Document } from 'mongoose';
import { DayOfWeek } from './Faculty';

export enum RoomType {
  LECTURE = 'LECTURE',
  LAB = 'LAB',
  SEMINAR = 'SEMINAR',
  CONFERENCE = 'CONFERENCE',
}

export interface IRoom extends Document {
  roomNumber: string;
  building: string;
  floor: number;
  type: RoomType;
  capacity: number;
  facilities: string[];
  availability: Array<{
    day: DayOfWeek;
    blockedSlots: number[];
  }>;
  isActive: boolean;
}

const RoomSchema: Schema = new Schema(
  {
    roomNumber: { type: String, required: true, unique: true },
    building: { type: String, required: true },
    floor: { type: Number, required: true },
    type: { type: String, enum: Object.values(RoomType), required: true },
    capacity: { type: Number, required: true },
    facilities: [{ type: String }],
    availability: [
      {
        day: { type: String, enum: Object.values(DayOfWeek), required: true },
        blockedSlots: [{ type: Number }], // array of slot numbers e.g. [1, 2, 3] that are unavailable
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Room || mongoose.model<IRoom>('Room', RoomSchema);
