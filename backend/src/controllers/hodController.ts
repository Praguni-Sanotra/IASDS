import { Response } from 'express';
import mongoose from 'mongoose';
import Timetable from '../models/Timetable';
import AuditLog from '../models/AuditLog';
import { AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';

/**
 * GET /api/hod/pending-timetables
 * Returns list of timetables awaiting HOD approval.
 */
export const getPendingTimetables = async (req: AuthRequest, res: Response) => {
  try {
    const pending = await Timetable.find({ status: 'PENDING_HOD_APPROVAL' })
      .sort({ updatedAt: -1 })
      .populate('generatedBy', 'name email');

    return res.json({ data: pending });
  } catch (error) {
    logger.error('[HODController] Fetch pending error:', error);
    return res.status(500).json({ message: 'Error fetching pending timetables.' });
  }
};

/**
 * POST /api/hod/timetable/:id/approve
 */
export const approveTimetable = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const timetable = await Timetable.findById(id);
    if (!timetable) return res.status(404).json({ message: 'Timetable not found.' });

    timetable.status = 'PUBLISHED'; // Or APPROVED_BY_HOD if you want a multi-step publish
    await timetable.save();

    await AuditLog.create({
      action: 'APPROVE_TIMETABLE',
      entity: 'TIMETABLE',
      entityId: id,
      performedBy: req.user?.id,
      ipAddress: req.ip,
    });

    return res.json({ message: 'Timetable approved and published successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Approval failed.' });
  }
};

/**
 * POST /api/hod/timetable/:id/reject
 */
export const rejectTimetable = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const timetable = await Timetable.findById(id);
    if (!timetable) return res.status(404).json({ message: 'Timetable not found.' });

    timetable.status = 'REJECTED_BY_HOD';
    await timetable.save();

    await AuditLog.create({
      action: 'REJECT_TIMETABLE',
      entity: 'TIMETABLE',
      entityId: id,
      performedBy: req.user?.id,
      ipAddress: req.ip,
      details: { reason },
    });

    return res.json({ message: 'Timetable rejected.' });
  } catch (error) {
    return res.status(500).json({ message: 'Rejection failed.' });
  }
};
