import { Request, Response } from 'express';
import Timetable from '../models/Timetable';
import Faculty from '../models/Faculty';
import Room from '../models/Room';
import Subject from '../models/Subject';
import { AuthRequest } from '../middleware/auth';

export const getWorkload = async (req: AuthRequest, res: Response) => {
  try {
    const timetable = await Timetable.findOne({ status: 'PUBLISHED' }).sort({ createdAt: -1 });
    if (!timetable) return res.json({ data: [], stats: {} });

    const faculties = await Faculty.find({ isActive: true });
    
    const workloadMap: Record<string, number> = {};
    timetable.slots.forEach((slot: any) => {
      const fId = slot.facultyId.toString();
      workloadMap[fId] = (workloadMap[fId] || 0) + 1;
    });

    const data = faculties.map(f => {
      const assigned = workloadMap[f._id.toString()] || 0;
      const max = f.maxHoursPerWeek || 18;
      return {
        facultyId: f._id,
        name: f.name,
        department: f.department,
        assignedHours: assigned,
        maxHours: max,
        utilizationPct: Math.round((assigned / max) * 100)
      };
    });

    // Simple Gini Coefficient calculation
    const loads = data.map(d => d.assignedHours).sort((a, b) => a - b);
    let gini = 0;
    if (loads.length > 0) {
      const n = loads.length;
      const sumLoads = loads.reduce((a, b) => a + b, 0);
      if (sumLoads > 0) {
        const sumOfDiffs = loads.reduce((sum, val, i) => sum + (2 * (i + 1) - n - 1) * val, 0);
        gini = sumOfDiffs / (n * sumLoads);
      }
    }

    res.json({
      data,
      stats: {
        avgHours: data.length ? data.reduce((a, b) => a + b.assignedHours, 0) / data.length : 0,
        giniCoefficient: parseFloat(gini.toFixed(2))
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching workload analytics' });
  }
};

export const getRoomUtilization = async (req: Request, res: Response) => {
  try {
    const timetable = await Timetable.findOne({ status: 'PUBLISHED' }).sort({ createdAt: -1 });
    const rooms = await Room.find({ isActive: true });
    
    const usageMap: Record<string, number> = {};
    if (timetable) {
      timetable.slots.forEach((slot: any) => {
        const rId = slot.roomId.toString();
        usageMap[rId] = (usageMap[rId] || 0) + 1;
      });
    }

    const totalSlotsPerWeek = 6 * 8; // Mon-Sat, 8 periods

    const data = rooms.map(r => {
      const occupied = usageMap[r._id.toString()] || 0;
      return {
        roomId: r._id,
        roomNumber: r.roomNumber,
        type: r.type,
        capacity: r.capacity,
        occupiedSlots: occupied,
        totalSlots: totalSlotsPerWeek,
        utilizationPct: Math.round((occupied / totalSlotsPerWeek) * 100)
      };
    });

    res.json({ data });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching room utilization' });
  }
};

export const getConflictHistory = async (req: Request, res: Response) => {
  try {
    const history = await Timetable.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('createdAt conflictCount status');

    const data = history.map(h => ({
      generatedAt: h.createdAt,
      conflictCount: h.conflictCount || 0,
      resolvedCount: 0, // Placeholder
      unresolvedCount: h.conflictCount || 0
    }));

    res.json({ data });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching conflict history' });
  }
};

export const getSubjectDistribution = async (req: Request, res: Response) => {
  try {
    const distribution = await Subject.aggregate([
      { $group: { _id: '$type', value: { $sum: 1 } } },
      { $project: { name: '$_id', value: 1, _id: 0 } }
    ]);
    res.json(distribution);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching subject distribution' });
  }
};

export const getOverview = async (req: Request, res: Response) => {
  try {
    const [facultyCount, subjectCount, roomCount, lastTimetable] = await Promise.all([
      Faculty.countDocuments({ isActive: true }),
      Subject.countDocuments({ isActive: true }),
      Room.countDocuments({ isActive: true }),
      Timetable.findOne().sort({ createdAt: -1 })
    ]);

    res.json({
      totalFaculty: facultyCount,
      totalSubjects: subjectCount,
      totalRooms: roomCount,
      activeTimetable: lastTimetable,
      lastGeneratedAt: lastTimetable?.createdAt,
      avgFairnessScore: lastTimetable?.fairnessScore || 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching overview analytics' });
  }
};
