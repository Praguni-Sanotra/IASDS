import { Request, Response } from 'express';
import Constraint, { ConstraintType } from '../models/Constraint';
import AuditLog from '../models/AuditLog';
import { AuthRequest } from '../middleware/auth';

export const getAllConstraints = async (req: Request, res: Response): Promise<void> => {
  try {
    const constraints = await Constraint.find().sort({ priority: -1 });
    
    // Group by HARD/SOFT type
    const grouped = constraints.reduce((acc: any, constraint: any) => {
      const type = constraint.type as ConstraintType;
      if (!acc[type]) acc[type] = [];
      acc[type].push(constraint);
      return acc;
    }, { HARD: [], SOFT: [] });

    res.json({ data: grouped });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateConstraint = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { isEnabled, config, priority } = req.body;
    
    const updatePayload: any = {};
    if (isEnabled !== undefined) updatePayload.isEnabled = isEnabled;
    if (config !== undefined) updatePayload.config = config;
    if (priority !== undefined) updatePayload.priority = priority;

    const constraint = await Constraint.findByIdAndUpdate(
      req.params.id,
      { $set: updatePayload },
      { new: true, runValidators: true }
    );

    if (!constraint) {
      res.status(404).json({ message: 'Constraint not found' });
      return;
    }

    await AuditLog.create({
      action: 'UPDATE',
      entity: 'CONSTRAINT',
      entityId: constraint._id,
      performedBy: req.user?.id,
      ipAddress: req.ip,
      details: { updatedFields: Object.keys(updatePayload) },
    });

    res.json({ message: 'Constraint updated', data: constraint });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const resetConstraints = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Delete all current constraints
    await Constraint.deleteMany({});

    // Restore from default seeds
    const defaultConstraints = [
      {
        name: 'No Overlapping Faculty',
        type: ConstraintType.HARD,
        category: 'FACULTY',
        description: 'A faculty member cannot be assigned to two different classes at the same time.',
        isEnabled: true,
        priority: 100,
      },
      {
        name: 'Room Capacity',
        type: ConstraintType.HARD,
        category: 'ROOM',
        description: 'The number of students in a class must not exceed room capacity.',
        isEnabled: true,
        priority: 100,
      },
      {
        name: 'Minimize Faculty Gaps',
        type: ConstraintType.SOFT,
        category: 'FACULTY',
        description: 'Try to minimize free periods between classes for faculty on a given day.',
        isEnabled: true,
        priority: 50,
      },
    ];

    const inserted = await Constraint.insertMany(defaultConstraints);

    await AuditLog.create({
      action: 'RESET',
      entity: 'CONSTRAINT',
      performedBy: req.user?.id,
      ipAddress: req.ip,
      details: { resetCount: inserted.length },
    });

    res.json({ message: 'Constraints reset to defaults', data: inserted });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};
