import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import Subject from '../models/Subject';
import Faculty from '../models/Faculty';
import AuditLog from '../models/AuditLog';
import { AuthRequest } from '../middleware/auth';
import { parseUploadedFile, bulkSoftDelete } from '../utils/bulkOperations';

export const getAllSubjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const department = req.query.department as string;
    const semester = req.query.semester as string;
    const type = req.query.type as string;

    const query: any = { isActive: true };

    if (search) {
      query.$or = [
        { code: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }
    if (department) query.department = department;
    if (semester) query.semester = parseInt(semester);
    if (type) query.type = type;

    const total = await Subject.countDocuments(query);
    const subjects = await Subject.find(query)
      .sort({ code: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('eligibleFaculty', 'name employeeId');

    res.json({
      data: subjects,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getSubjectById = async (req: Request, res: Response): Promise<void> => {
  try {
    const subject = await Subject.findById(req.params.id).populate('eligibleFaculty', 'name email employeeId');
    if (!subject || !subject.isActive) {
      res.status(404).json({ message: 'Subject not found' });
      return;
    }
    res.json({ data: subject });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createSubject = async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ message: 'Validation Error', errors: errors.array() }) as any;

  try {
    const existing = await Subject.findOne({ code: req.body.code.toUpperCase() });
    if (existing) {
      res.status(400).json({ message: 'Subject code already exists' });
      return;
    }

    if (req.body.eligibleFaculty && req.body.eligibleFaculty.length > 0) {
      const validCount = await Faculty.countDocuments({ _id: { $in: req.body.eligibleFaculty } });
      if (validCount !== req.body.eligibleFaculty.length) {
        res.status(400).json({ message: 'One or more eligible faculty IDs are invalid' });
        return;
      }
    }

    const subject = await Subject.create({ ...req.body, code: req.body.code.toUpperCase() });

    await AuditLog.create({
      action: 'CREATE',
      entity: 'SUBJECT',
      entityId: subject._id,
      performedBy: req.user?.id,
      ipAddress: req.ip,
      details: { code: subject.code },
    });

    res.status(201).json({ message: 'Subject created', data: subject });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateSubject = async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ message: 'Validation Error', errors: errors.array() }) as any;

  try {
    const subject = await Subject.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!subject) {
      res.status(404).json({ message: 'Subject not found' });
      return;
    }

    await AuditLog.create({
      action: 'UPDATE',
      entity: 'SUBJECT',
      entityId: subject._id,
      performedBy: req.user?.id,
      ipAddress: req.ip,
      details: { updatedFields: Object.keys(req.body) },
    });

    res.json({ message: 'Subject updated', data: subject });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteSubject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      res.status(404).json({ message: 'Subject not found' });
      return;
    }

    subject.isActive = false;
    await subject.save();

    await AuditLog.create({
      action: 'DELETE',
      entity: 'SUBJECT',
      entityId: subject._id,
      performedBy: req.user?.id,
      ipAddress: req.ip,
      details: { code: subject.code },
    });

    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const bulkDeleteSubjects = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await bulkSoftDelete(Subject, req.body.ids, req.user?.id, req.ip, 'SUBJECT');
    if (result.deleted === 0) {
      res.status(404).json({ message: 'No matching active records found', notFound: result.notFound });
      return;
    }
    res.json({ message: 'Bulk delete operation completed', ...result });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const bulkUploadSubjects = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const data = parseUploadedFile(req.file.buffer, req.file.mimetype);
    let successCount = 0;
    let failedCount = 0;
    const errors: Array<{ row: number; reason: string }> = [];

    const existingCodesRaw = await Subject.find().select('code');
    const existingCodes = new Set(existingCodesRaw.map((s) => s.code.toUpperCase()));

    const validRows = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2;

      const { code, name, credits, hoursPerWeek, type, department, semester } = row;

      if (!code || !name || !credits || !hoursPerWeek || !type || !department || !semester) {
        failedCount++;
        errors.push({ row: rowNumber, reason: 'Missing required fields' });
        continue;
      }

      if (existingCodes.has(String(code).toUpperCase())) {
        failedCount++;
        errors.push({ row: rowNumber, reason: 'Subject code already exists' });
        continue;
      }

      existingCodes.add(String(code).toUpperCase());

      validRows.push({
        code: String(code).toUpperCase(),
        name,
        credits: parseInt(credits),
        hoursPerWeek: parseInt(hoursPerWeek),
        type: String(type).toUpperCase(),
        department,
        semester: parseInt(semester),
      });
    }

    if (validRows.length > 0) {
      await Subject.insertMany(validRows, { ordered: false });
      successCount = validRows.length;
    }

    await AuditLog.create({
      action: 'BULK_UPLOAD',
      entity: 'SUBJECT',
      performedBy: req.user?.id,
      ipAddress: req.ip,
      details: { file: req.file.originalname, successCount, failedCount },
    });

    res.json({ success: successCount, failed: failedCount, errors });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error while processing file' });
  }
};

export const downloadTemplate = (req: Request, res: Response): void => {
  const csvContent = 'code,name,credits,hoursPerWeek,type,department,semester\nCS101,Introduction to Programming,3,3,THEORY,CSE,1\nCS101L,Programming Lab,2,2,LAB,CSE,1\n';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=subject_template.csv');
  res.status(200).send(csvContent);
};
