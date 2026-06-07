import { Request, Response } from 'express';
import axios from 'axios';
import { getIO } from '../socket';
import redis from '../config/redis';
import Timetable from '../models/Timetable';
import { AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';
import { ensureTimetableSlotIds } from '../utils/timetableSlots';
import { enrichSlotsWithTeachers } from '../utils/teacherLoader';

const SCHEDULER_URL = process.env.SCHEDULER_URL || 'http://localhost:8000';

export const generateSchedule = async (req: AuthRequest, res: Response) => {
  const { semesterId, academicYear, config } = req.body;

  try {
    const response = await axios.post(`${SCHEDULER_URL}/generate`, {
      semesterId,
      academicYear,
      config,
    });

    const { jobId } = response.data;

    // Save job info to Redis
    await redis.set(
      `schedule:job:${jobId}`,
      JSON.stringify({
        status: 'queued',
        semesterId,
        startedBy: req.user?.id,
        startedAt: new Date().toISOString(),
      }),
      'EX',
      60 * 60 * 24 // 24 hours TTL
    );

    res.json({
      jobId,
      status: 'queued',
      message: 'Schedule generation started',
    });
  } catch (error) {
    logger.error('Error triggering scheduler:', error);
    res.status(500).json({ message: 'Failed to start scheduler' });
  }
};

export const getStatus = async (req: Request, res: Response) => {
  const { jobId } = req.params;

  try {
    const response = await axios.get(`${SCHEDULER_URL}/status/${jobId}`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch job status' });
  }
};

export const getLatestTimetable = async (req: Request, res: Response) => {
  try {
    const { department, semesterId } = req.query;

    const filter: Record<string, unknown> = { status: 'PUBLISHED' };
    if (department) {
      filter.department = String(department).toUpperCase();
    }
    if (semesterId) {
      filter.semesterId = String(semesterId);
    }

    let timetable = await Timetable.findOne(filter)
      .sort({ createdAt: -1 })
      .populate('slots.subjectId')
      .populate('slots.roomId');

    // Fall back to latest published if scoped query returns nothing
    if (!timetable && (department || semesterId)) {
      timetable = await Timetable.findOne({ status: 'PUBLISHED' })
        .sort({ createdAt: -1 })
        .populate('slots.subjectId')
        .populate('slots.roomId');
    }

    if (!timetable) {
      return res.status(404).json({ message: 'No published timetable found' });
    }

    await ensureTimetableSlotIds(timetable);

    const response = timetable.toObject();
    response.slots = await enrichSlotsWithTeachers(response.slots);

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching latest timetable' });
  }
};

export const getHistory = async (req: Request, res: Response) => {
  try {
    const history = await Timetable.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .select('createdAt status metadata solvingTime conflictCount fairnessScore');

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching history' });
  }
};

export const publishTimetable = async (req: Request, res: Response) => {
  const { timetableId } = req.params;

  try {
    const target = await Timetable.findById(timetableId);
    if (!target) {
      return res.status(404).json({ message: 'Timetable not found' });
    }

    const archiveFilter: Record<string, unknown> = { status: 'PUBLISHED' };
    if (target.department) archiveFilter.department = target.department;
    if (target.semesterId) archiveFilter.semesterId = target.semesterId;
    await Timetable.updateMany(archiveFilter, { status: 'ARCHIVED' });

    const timetable = await Timetable.findByIdAndUpdate(
      timetableId,
      { status: 'PUBLISHED' },
      { new: true }
    );

    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found' });
    }

    // Emit event
    getIO().emit('timetable:published', {
      message: 'A new timetable has been published',
      publishedAt: new Date().toISOString(),
    });

    res.json({ message: 'Timetable published successfully', data: timetable });
  } catch (error) {
    res.status(500).json({ message: 'Error publishing timetable' });
  }
};

// Internal endpoint for Python scheduler to report progress
export const handleInternalProgress = async (req: Request, res: Response) => {
  const { jobId, progress, stage, message, status, timetableId, conflictCount, fairnessScore, error } = req.body;

  // Validate internal secret
  if (req.headers['x-internal-secret'] !== process.env.INTERNAL_SECRET) {
    return res.status(401).json({ message: 'Unauthorized internal call' });
  }

  const io = getIO();

  if (status === 'SUCCESS') {
    io.to(`job:${jobId}`).emit('schedule:complete', { jobId, timetableId, conflictCount, fairnessScore });
    await redis.set(`schedule:job:${jobId}`, JSON.stringify({ status: 'completed' }), 'EX', 3600);
  } else if (status === 'FAILURE') {
    io.to(`job:${jobId}`).emit('schedule:error', { jobId, error });
    await redis.set(`schedule:job:${jobId}`, JSON.stringify({ status: 'failed', error }), 'EX', 3600);
  } else {
    io.to(`job:${jobId}`).emit('schedule:progress', { jobId, progress, stage, message });
  }

  res.json({ status: 'ok' });
};

export const rescheduleTimetable = async (req: AuthRequest, res: Response) => {
  const { timetableId, triggerType, affectedEntityId, affectedDay, affectedPeriods, targetDay, targetPeriod } = req.body;

  try {
    const timetable = await Timetable.findById(timetableId);
    if (!timetable) return res.status(404).json({ message: 'Timetable not found' });

    // Fetch context for Python engine
    const [faculties, subjects, rooms] = await Promise.all([
      require('../models/Faculty').default.find({ isActive: true }).lean(),
      require('../models/Subject').default.find({ isActive: true }).lean(),
      require('../models/Room').default.find({ isActive: true }).lean(),
    ]);

    const response = await axios.post(`${SCHEDULER_URL}/reschedule`, {
      timetableId,
      triggerType,
      affectedEntityId,
      affectedDay,
      affectedPeriods,
      targetDay,
      targetPeriod,
      allSlots: timetable.slots,
      faculties: faculties.map((f: any) => ({ id: f._id.toString(), ...f })),
      subjects: subjects.map((s: any) => ({ id: s._id.toString(), ...s })),
      rooms: rooms.map((r: any) => ({ id: r._id.toString(), ...r })),
    });

    if (response.data.status === 'CONFLICT') {
      return res.status(409).json({ message: 'Reschedule conflict detected', conflicts: response.data.conflicts });
    }

    // Apply diff to MongoDB (simplified for manual move)
    if (triggerType === 'MANUAL_MOVE') {
      const slotIndex = timetable.slots.findIndex((s: any) => 
        s.facultyId.toString() === affectedEntityId && 
        s.day === affectedDay && 
        affectedPeriods.includes(s.period)
      );

      if (slotIndex > -1) {
        timetable.slots[slotIndex].day = targetDay;
        timetable.slots[slotIndex].period = targetPeriod;
        await timetable.save();
      }
    }

    // Emit real-time update
    getIO().emit('timetable:updated', { timetableId, diff: response.data.updatedSlots });

    res.json({ message: 'Reschedule successful', data: response.data });
  } catch (error) {
    logger.error('Reschedule error:', error);
    res.status(500).json({ message: 'Internal server error during rescheduling' });
  }
};

export const llmQuery = async (req: AuthRequest, res: Response) => {
  const { query, sessionId } = req.body;

  try {
    const response = await axios({
      method: 'post',
      url: `${SCHEDULER_URL}/llm/query`,
      data: { query, userId: req.user?.id, sessionId },
      responseType: 'stream'
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    response.data.pipe(res);
  } catch (error) {
    console.error('LLM Proxy error:', error);
    res.status(500).json({ message: 'AI Assistant currently unavailable' });
  }
};
