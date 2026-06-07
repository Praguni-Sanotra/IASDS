import mongoose from 'mongoose';
import { ITimetable } from '../models/Timetable';

/**
 * Python scheduler inserts slot subdocuments without _id.
 * Mongoose assigns ephemeral ids when serializing to JSON, which break updates.
 * Persist real ObjectIds for any slot missing them.
 */
export async function ensureTimetableSlotIds(timetable: ITimetable): Promise<boolean> {
  let modified = false;

  for (const slot of timetable.slots as any[]) {
    if (!slot._id) {
      slot._id = new mongoose.Types.ObjectId();
      modified = true;
    }
  }

  if (modified) {
    timetable.markModified('slots');
    await timetable.save();
  }

  return modified;
}

export interface SlotLookupHints {
  day?: string;
  period?: number;
  batch?: string;
  section?: string;
}

export function findSlotIndex(
  timetable: ITimetable,
  slotId: string,
  hints?: SlotLookupHints
): number {
  const byId = timetable.slots.findIndex(
    (s: any) => s._id && s._id.toString() === slotId
  );
  if (byId !== -1) return byId;

  if (hints?.day !== undefined && hints.period !== undefined) {
    const periodNum = Number(hints.period);
    return timetable.slots.findIndex((s: any) => {
      if (s.day !== hints.day || s.period !== periodNum) return false;
      if (hints.batch && s.batch !== hints.batch) return false;
      if (hints.section && s.section !== hints.section) return false;
      return true;
    });
  }

  return -1;
}
