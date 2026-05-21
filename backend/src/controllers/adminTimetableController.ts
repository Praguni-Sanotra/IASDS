import { Response } from 'express';
import axios from 'axios';
import mongoose from 'mongoose';
import Timetable from '../models/Timetable';
import Subject from '../models/Subject';
import Faculty from '../models/Faculty';
import AuditLog from '../models/AuditLog';
import { AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';

const SCHEDULER_URL = process.env.SCHEDULER_URL || 'http://localhost:8000';

/**
 * POST /api/admin/generate-timetable
 *
 * Synchronous AI timetable generation endpoint.
 * Calls the Python scheduler's /generate-sync endpoint directly
 * (no Celery/Redis required). Returns the full result in one request.
 *
 * Flow:
 *   1. Validate input (department, semester, academicYear)
 *   2. Call Python CSP solver synchronously
 *   3. Return success with timetable metadata
 *   4. Frontend refreshes to display new timetable
 */
export const generateAITimetable = async (req: AuthRequest, res: Response) => {
  const { department, semester, academicYear, allowFallbacks = true } = req.body;

  // ── 1. INPUT VALIDATION ─────────────────────────────────────────────────────
  const errors: string[] = [];

  if (!department || typeof department !== 'string' || department.trim() === '') {
    errors.push('Department is required.');
  }

  const semesterNum = parseInt(semester);
  if (!semester || isNaN(semesterNum) || semesterNum < 1 || semesterNum > 8) {
    errors.push('Semester must be a number between 1 and 8.');
  }

  if (!academicYear || typeof academicYear !== 'string') {
    errors.push('Academic Year is required (e.g. 2025-26).');
  } else if (!/^\d{4}-\d{2,4}$/.test(academicYear.trim())) {
    errors.push('Academic Year format must be YYYY-YY or YYYY-YYYY (e.g. 2025-26).');
  }

  if (errors.length > 0) {
    return res.status(400).json({ message: errors.join(' '), errors });
  }

  const cleanDept = department.trim().toUpperCase();
  const cleanYear = academicYear.trim();

  logger.info(`[AdminTimetable] Generation requested — dept=${cleanDept}, sem=${semesterNum}, year=${cleanYear} by user=${req.user?.id}`);

  try {
    // ── 2. CALL PYTHON CSP SCHEDULER (synchronous) ───────────────────────────
    const schedulerRes = await axios.post(
      `${SCHEDULER_URL}/generate-sync`,
      {
        department: cleanDept,
        semester: semesterNum,
        academicYear: cleanYear,
        allowFallbacks: allowFallbacks,
        timeout: 60,
      },
      {
        timeout: 90_000, // 90s HTTP timeout (solver runs up to 60s)
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const { timetableId, stats, message } = schedulerRes.data as any;

    // ── 3. AUDIT LOG (non-critical — don't fail generation if this fails) ────
    try {
      await AuditLog.create({
        action: 'GENERATE_TIMETABLE',
        entity: 'TIMETABLE',
        entityId: timetableId,
        performedBy: req.user?.id,
        ipAddress: req.ip,
        details: {
          department: cleanDept,
          semester: semesterNum,
          academicYear: cleanYear,
          algorithm: 'OR_TOOLS_CSP_SYNC',
          ...stats,
        },
      });
    } catch (auditErr: any) {
      logger.warn('[AdminTimetable] AuditLog creation failed (non-critical):', auditErr.message);
    }

    logger.info(`[AdminTimetable] Generation SUCCESS — timetableId=${timetableId}, slots=${stats?.totalSlots}`);

    return res.status(201).json({
      message,
      timetableId,
      stats,
    });

  } catch (error: any) {
    // ── 4. ERROR HANDLING ────────────────────────────────────────────────────
    logger.error('[AdminTimetable] Generation FAILED:', error?.response?.data || error.message);

    // Validation error or infeasible from Python (422)
    if (error?.response?.status === 422) {
      const detail = error.response.data?.detail;
      return res.status(422).json({
        message: detail?.message || 'Configuration error: missing subjects, faculty, or rooms.',
        diagnostics: detail?.diagnostics || [],
        fixes: detail?.fixes || []
      });
    }

    // Conflict / infeasible (legacy 409)
    if (error?.response?.status === 409) {
      return res.status(409).json({
        message: error.response.data?.detail || 'Unable to generate a conflict-free timetable. Check faculty availability and room assignments.',
      });
    }

    // Scheduler service unavailable
    if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
      return res.status(503).json({
        message: 'Scheduler service is unavailable. Ensure the Python scheduler is running on port 8000.',
      });
    }

    // Timeout
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        message: 'Timetable generation timed out. Try reducing the number of subjects or increasing faculty availability.',
      });
    }

    return res.status(500).json({
      message: 'An unexpected error occurred during timetable generation.',
      detail: error?.message || String(error),
    });
  }
};

/**
 * GET /api/admin/timetable-history
 *
 * Returns list of all generated timetables for the admin history view.
 */
export const getTimetableHistory = async (req: AuthRequest, res: Response) => {
  try {
    const history = await Timetable.find()
      .sort({ createdAt: -1 })
      .limit(30)
      .select('semesterId department academicYear status algorithm solvingTimeMs conflictCount fairnessScore createdAt generatedAt generatedBy')
      .populate('generatedBy', 'name email');

    return res.json({ data: history, total: history.length });
  } catch (error) {
    logger.error('[AdminTimetable] History fetch error:', error);
    return res.status(500).json({ message: 'Error fetching timetable history' });
  }
};

/**
 * DELETE /api/admin/timetable/:id
 *
 * Deletes (hard) a specific timetable document.
 */
export const deleteTimetable = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid timetable ID.' });
  }

  try {
    const deleted = await Timetable.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Timetable not found.' });
    }

    await AuditLog.create({
      action: 'DELETE_TIMETABLE',
      entity: 'TIMETABLE',
      entityId: id,
      performedBy: req.user?.id,
      ipAddress: req.ip,
      details: { semesterId: deleted.semesterId, academicYear: deleted.academicYear },
    });

    return res.json({ message: 'Timetable deleted successfully.' });
  } catch (error) {
    logger.error('[AdminTimetable] Delete error:', error);
    return res.status(500).json({ message: 'Error deleting timetable.' });
  }
};

export const updateTimetableSlot = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const slotId = req.params.slotId as string;
  const { day, period, subjectId, facultyId, roomId, batch, section, force = false } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(slotId)) {
    return res.status(400).json({ message: 'Invalid ID format.' });
  }

  try {
    const timetable = await Timetable.findById(id);
    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found.' });
    }

    const slotIndex = timetable.slots.findIndex((s: any) => s._id.toString() === slotId);
    if (slotIndex === -1) {
      return res.status(404).json({ message: 'Slot not found in this timetable.' });
    }

    const periodNum = parseInt(period);

    if (!force) {
      const conflictCheck = await checkSlotConflicts(
        id,
        slotId,
        day,
        periodNum,
        facultyId || timetable.slots[slotIndex].facultyId.toString(),
        roomId || timetable.slots[slotIndex].roomId.toString(),
        batch || timetable.slots[slotIndex].batch,
        section || timetable.slots[slotIndex].section
      );

      if (conflictCheck.conflict) {
        return res.status(409).json({
          message: 'Conflict detected',
          conflicts: conflictCheck.messages,
        });
      }
    }

    if (day) timetable.slots[slotIndex].day = day;
    if (period !== undefined) timetable.slots[slotIndex].period = periodNum;
    if (subjectId) timetable.slots[slotIndex].subjectId = new mongoose.Types.ObjectId(subjectId);
    if (facultyId) timetable.slots[slotIndex].facultyId = new mongoose.Types.ObjectId(facultyId);
    if (roomId) timetable.slots[slotIndex].roomId = new mongoose.Types.ObjectId(roomId);
    if (batch) timetable.slots[slotIndex].batch = batch;
    if (section) timetable.slots[slotIndex].section = section;

    const times: Record<number, { s: string; e: string }> = {
      0: { s: '09:35', e: '10:35' },
      1: { s: '10:35', e: '11:35' },
      2: { s: '11:35', e: '12:35' },
      3: { s: '12:35', e: '13:35' },
      4: { s: '14:35', e: '15:35' },
      5: { s: '15:35', e: '16:35' },
    };
    const timing = times[periodNum] || { s: '09:00', e: '10:00' };
    timetable.slots[slotIndex].startTime = timing.s;
    timetable.slots[slotIndex].endTime = timing.e;

    if (subjectId) {
      const subject = await Subject.findById(subjectId);
      if (subject) {
        timetable.slots[slotIndex].isLab = subject.type === 'LAB';
      }
    }

    await timetable.save();

    await AuditLog.create({
      action: 'UPDATE_TIMETABLE_SLOT',
      entity: 'TIMETABLE',
      entityId: id,
      performedBy: req.user?.id,
      ipAddress: req.ip,
      details: { slotId, day, period },
    });

    const { getIO } = require('../socket');
    getIO().emit('timetable:updated', { timetableId: id });

    return res.json({ message: 'Slot updated successfully.', data: timetable });
  } catch (error) {
    logger.error('[AdminTimetable] Slot update error:', error);
    return res.status(500).json({ message: 'Error updating slot.' });
  }
};

export const addTimetableSlot = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { day, period, subjectId, facultyId, roomId, batch, section, force = false } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid Timetable ID.' });
  }

  if (!day || period === undefined || !subjectId || !facultyId || !roomId || !batch || !section) {
    return res.status(400).json({ message: 'Missing required fields to create a slot.' });
  }

  try {
    const timetable = await Timetable.findById(id);
    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found.' });
    }

    const periodNum = parseInt(period);

    if (!force) {
      const conflictCheck = await checkSlotConflicts(
        id,
        null,
        day,
        periodNum,
        facultyId,
        roomId,
        batch,
        section
      );

      if (conflictCheck.conflict) {
        return res.status(409).json({
          message: 'Conflict detected',
          conflicts: conflictCheck.messages,
        });
      }
    }

    const times: Record<number, { s: string; e: string }> = {
      0: { s: '09:35', e: '10:35' },
      1: { s: '10:35', e: '11:35' },
      2: { s: '11:35', e: '12:35' },
      3: { s: '12:35', e: '13:35' },
      4: { s: '14:35', e: '15:35' },
      5: { s: '15:35', e: '16:35' },
    };
    const timing = times[periodNum] || { s: '09:00', e: '10:00' };

    const subject = await Subject.findById(subjectId);
    const isLab = subject ? subject.type === 'LAB' : false;

    const newSlot = {
      day,
      period: periodNum,
      startTime: timing.s,
      endTime: timing.e,
      subjectId: new mongoose.Types.ObjectId(subjectId),
      facultyId: new mongoose.Types.ObjectId(facultyId),
      roomId: new mongoose.Types.ObjectId(roomId),
      batch,
      section,
      isLab,
    };

    timetable.slots.push(newSlot);
    await timetable.save();

    await AuditLog.create({
      action: 'ADD_TIMETABLE_SLOT',
      entity: 'TIMETABLE',
      entityId: id,
      performedBy: req.user?.id,
      ipAddress: req.ip,
      details: { day, period },
    });

    const { getIO } = require('../socket');
    getIO().emit('timetable:updated', { timetableId: id });

    return res.status(201).json({ message: 'Slot added successfully.', data: timetable });
  } catch (error) {
    logger.error('[AdminTimetable] Slot add error:', error);
    return res.status(500).json({ message: 'Error adding slot.' });
  }
};

export const deleteTimetableSlot = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const slotId = req.params.slotId as string;

  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(slotId)) {
    return res.status(400).json({ message: 'Invalid ID format.' });
  }

  try {
    const timetable = await Timetable.findById(id);
    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found.' });
    }

    const slotIndex = timetable.slots.findIndex((s: any) => s._id.toString() === slotId);
    if (slotIndex === -1) {
      return res.status(404).json({ message: 'Slot not found in this timetable.' });
    }

    const removedSlot = timetable.slots[slotIndex];
    timetable.slots.splice(slotIndex, 1);
    await timetable.save();

    await AuditLog.create({
      action: 'DELETE_TIMETABLE_SLOT',
      entity: 'TIMETABLE',
      entityId: id,
      performedBy: req.user?.id,
      ipAddress: req.ip,
      details: { slotId, day: removedSlot.day, period: removedSlot.period },
    });

    const { getIO } = require('../socket');
    getIO().emit('timetable:updated', { timetableId: id });

    return res.json({ message: 'Slot deleted successfully.', data: timetable });
  } catch (error) {
    logger.error('[AdminTimetable] Slot delete error:', error);
    return res.status(500).json({ message: 'Error deleting slot.' });
  }
};

const checkSlotConflicts = async (
  timetableId: string,
  slotIdToExclude: string | null,
  day: string,
  period: number,
  facultyId: string,
  roomId: string,
  batch: string,
  section: string
) => {
  const Timetable = require('../models/Timetable').default;
  const Faculty = require('../models/Faculty').default;
  
  const timetable = await Timetable.findById(timetableId);
  const conflicts: string[] = [];
  
  if (!timetable) return { conflict: false, messages: [] };

  for (const s of timetable.slots) {
    if (slotIdToExclude && s._id.toString() === slotIdToExclude) continue;

    if (s.day === day && s.period === period) {
      if (s.facultyId.toString() === facultyId) {
        conflicts.push(`Faculty conflict: Faculty is already assigned to batch ${s.batch} (Section ${s.section}) in this period.`);
      }
      if (s.roomId.toString() === roomId) {
        conflicts.push(`Room conflict: Room is already occupied by batch ${s.batch} (Section ${s.section}) in this period.`);
      }
      if (s.batch === batch && s.section === section) {
        conflicts.push(`Batch conflict: Batch ${s.batch} Section ${s.section} already has a class in this period.`);
      }
    }
  }

  const faculty = await Faculty.findById(facultyId);
  if (faculty) {
    const dayAvail = faculty.availability.find((a: any) => a.day === day);
    if (dayAvail && dayAvail.availableSlots && dayAvail.availableSlots.length > 0) {
      const normalizedPeriod = period + 1;
      if (!dayAvail.availableSlots.includes(normalizedPeriod)) {
        conflicts.push(`Faculty Availability Warning: Faculty is not marked as available for ${day} Period ${normalizedPeriod}.`);
      }
    }
  }

  return {
    conflict: conflicts.length > 0,
    messages: conflicts
  };
};

export const sendTimetableToHOD = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id as string)) {
    return res.status(400).json({ message: 'Invalid timetable ID.' });
  }

  try {
    const timetable = await Timetable.findById(id as any);
    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found.' });
    }

    // Update status to pending HOD approval
    timetable.status = 'PENDING_HOD_APPROVAL';
    await timetable.save();

    await AuditLog.create({
      action: 'SEND_TO_HOD',
      entity: 'TIMETABLE',
      entityId: id as any,
      performedBy: req.user?.id,
      ipAddress: req.ip,
      details: { 
        semesterId: timetable.semesterId, 
        academicYear: timetable.academicYear,
        status: timetable.status 
      },
    });

    logger.info(`[AdminTimetable] Timetable ${id} sent to HOD by ${req.user?.id}`);

    return res.json({ 
      message: 'Timetable submitted to HOD successfully.',
      status: timetable.status 
    });
  } catch (error) {
    logger.error('[AdminTimetable] Send to HOD error:', error);
    return res.status(500).json({ message: 'Error submitting timetable to HOD.' });
  }
};

