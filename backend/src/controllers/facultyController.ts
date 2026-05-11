import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';
import * as xlsx from 'xlsx';
import Faculty from '../models/Faculty';
import User, { UserRole } from '../models/User';
import Subject from '../models/Subject';
import AuditLog from '../models/AuditLog';
import { AuthRequest } from '../middleware/auth';
import { Types } from 'mongoose';

// ==========================================
// CRUD OPERATIONS
// ==========================================

export const getAllFaculty = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const department = req.query.department as string;
    const sortBy = (req.query.sortBy as string) || 'name';
    const order = (req.query.order as string) === 'desc' ? -1 : 1;

    const query: any = { isActive: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
      ];
    }

    if (department) {
      query.department = department;
    }

    const total = await Faculty.countDocuments(query);
    console.log(`[DEBUG] getAllFaculty: found ${total} active records. Query:`, query);
    
    const faculty = await Faculty.find(query)
      .sort({ [sortBy]: order })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'role lastLogin isActive');
    
    console.log(`[DEBUG] getAllFaculty: returning ${faculty.length} records for page ${page}`);

    res.json({
      data: faculty,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('getAllFaculty error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getFacultyById = async (req: Request, res: Response): Promise<void> => {
  try {
    const faculty = await Faculty.findById(req.params.id).populate('subjectsTaught.subjectId');
    if (!faculty || !faculty.isActive) {
      res.status(404).json({ message: 'Faculty not found' });
      return;
    }
    res.json({ data: faculty });
  } catch (error) {
    console.error('getFacultyById error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createFaculty = async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ message: 'Validation Error', errors: errors.array() });
    return;
  }

  const { name, email, department, phone, subjectsTaught, maxHoursPerWeek, employeeId } = req.body;

  try {
    // Check unique email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: 'Email already exists' });
      return;
    }

    // Validate subjects if provided
    if (subjectsTaught && subjectsTaught.length > 0) {
      const subjectIds = subjectsTaught.map((s: any) => s.subjectId);
      const validSubjects = await Subject.countDocuments({ _id: { $in: subjectIds } });
      if (validSubjects !== subjectIds.length) {
        res.status(400).json({ message: 'One or more invalid subject IDs' });
        return;
      }
    }

    // Create User first
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('Faculty@123', salt); // default password

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: UserRole.FACULTY,
      department,
    });

    // Create Faculty
    const empId = employeeId || `EMP${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
    
    const newFaculty = await Faculty.create({
      userId: newUser._id,
      employeeId: empId,
      name,
      email,
      department,
      phone,
      subjectsTaught: subjectsTaught || [],
      availability: [],
      maxHoursPerWeek: maxHoursPerWeek || 40,
    });

    // Log to AuditLog
    await AuditLog.create({
      action: 'CREATE',
      entity: 'FACULTY',
      entityId: newFaculty._id,
      performedBy: req.user?.id,
      ipAddress: req.ip,
      details: { email: newFaculty.email, employeeId: newFaculty.employeeId },
    });

    res.status(201).json({ message: 'Faculty created successfully', data: newFaculty });
  } catch (error) {
    console.error('createFaculty error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateFaculty = async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ message: 'Validation Error', errors: errors.array() });
    return;
  }

  try {
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) {
      res.status(404).json({ message: 'Faculty not found' });
      return;
    }

    const updatedFaculty = await Faculty.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    // If name or email was updated, sync with User
    if (req.body.name || req.body.email || req.body.department) {
      await User.findByIdAndUpdate(faculty.userId, {
        name: req.body.name || faculty.name,
        email: req.body.email || faculty.email,
        department: req.body.department || faculty.department,
      });
    }

    await AuditLog.create({
      action: 'UPDATE',
      entity: 'FACULTY',
      entityId: faculty._id,
      performedBy: req.user?.id,
      ipAddress: req.ip,
      details: { updatedFields: Object.keys(req.body) },
    });

    res.json({ message: 'Faculty updated successfully', data: updatedFaculty });
  } catch (error) {
    console.error('updateFaculty error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteFaculty = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) {
      res.status(404).json({ message: 'Faculty not found' });
      return;
    }

    // Soft delete
    faculty.isActive = false;
    await faculty.save();

    // Soft delete user
    await User.findByIdAndUpdate(faculty.userId, { isActive: false });

    // Log action
    await AuditLog.create({
      action: 'DELETE',
      entity: 'FACULTY',
      entityId: faculty._id,
      performedBy: req.user?.id,
      ipAddress: req.ip,
      details: { email: faculty.email },
    });

    res.json({ message: 'Faculty deleted successfully' });
  } catch (error) {
    console.error('deleteFaculty error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ==========================================
// MASS DELETE
// ==========================================

export const bulkDeleteFaculty = async (req: AuthRequest, res: Response): Promise<void> => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ message: 'Please provide an array of faculty IDs' });
    return;
  }

  try {
    // Validate all IDs exist and are active
    const faculties = await Faculty.find({ _id: { $in: ids }, isActive: true });
    const foundIds = faculties.map((f) => f._id.toString());
    const notFound = ids.filter((id) => !foundIds.includes(id));

    if (foundIds.length === 0) {
      res.status(404).json({ message: 'No matching active faculty records found to delete', notFound });
      return;
    }

    // Soft delete all in one updateMany
    await Faculty.updateMany({ _id: { $in: foundIds } }, { $set: { isActive: false } });

    // Also soft delete associated users
    const userIds = faculties.map((f) => f.userId);
    await User.updateMany({ _id: { $in: userIds } }, { $set: { isActive: false } });

    // Log bulk action
    await AuditLog.create({
      action: 'BULK_DELETE',
      entity: 'FACULTY',
      performedBy: req.user?.id,
      ipAddress: req.ip,
      details: { deletedCount: foundIds.length, ids: foundIds },
    });

    res.json({
      message: 'Bulk delete operation completed',
      deleted: foundIds.length,
      notFound,
    });
  } catch (error) {
    console.error('bulkDeleteFaculty error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ==========================================
// BULK UPLOAD (CSV/Excel)
// ==========================================

export const bulkUploadFaculty = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    // Parse Excel/CSV from buffer
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data: any[] = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let successCount = 0;
    let failedCount = 0;
    const errors: Array<{ row: number; reason: string }> = [];

    // Pre-cache emails to optimize DB calls
    const existingUsers = await User.find({ role: UserRole.FACULTY }).select('email');
    const existingEmails = new Set(existingUsers.map((u) => u.email.toLowerCase()));

    const validRows = [];
    const validUsers = [];

    // Process rows sequentially
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // +1 for 0-index, +1 for header

      const { name, email, department, phone, maxHoursPerWeek } = row;

      // Validate required fields
      if (!name || !email || !department) {
        failedCount++;
        errors.push({ row: rowNumber, reason: 'Missing required fields (name, email, department)' });
        continue;
      }

      // Validate email format (simple regex)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        failedCount++;
        errors.push({ row: rowNumber, reason: 'Invalid email format' });
        continue;
      }

      // Validate duplicates
      if (existingEmails.has(email.toLowerCase())) {
        failedCount++;
        errors.push({ row: rowNumber, reason: 'Email already exists' });
        continue;
      }

      // Add to set to prevent duplicates within the file itself
      existingEmails.add(email.toLowerCase());

      const empId = `EMP${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;

      validRows.push({
        name,
        email: email.toLowerCase(),
        department,
        phone: phone ? String(phone) : undefined,
        maxHoursPerWeek: parseInt(maxHoursPerWeek) || 40,
        employeeId: empId,
      });
    }

    if (validRows.length > 0) {
      // 1. Bulk insert Users
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash('Faculty@123', salt);

      const userDocs = validRows.map((r) => ({
        _id: new Types.ObjectId(),
        name: r.name,
        email: r.email,
        password: hashedPassword,
        role: UserRole.FACULTY,
        department: r.department,
      }));

      // ordered: false allows continuing even if one document fails unique constraints
      await User.insertMany(userDocs, { ordered: false });

      // 2. Bulk insert Faculty
      const facultyDocs = validRows.map((r, index) => ({
        userId: userDocs[index]._id,
        employeeId: r.employeeId,
        name: r.name,
        email: r.email,
        department: r.department,
        phone: r.phone,
        maxHoursPerWeek: r.maxHoursPerWeek,
        subjectsTaught: [],
        availability: [],
      }));

      await Faculty.insertMany(facultyDocs, { ordered: false });
      successCount = validRows.length;
    }

    // Log bulk action
    await AuditLog.create({
      action: 'BULK_UPLOAD',
      entity: 'FACULTY',
      performedBy: req.user?.id,
      ipAddress: req.ip,
      details: { file: req.file.originalname, successCount, failedCount },
    });

    res.json({
      success: successCount,
      failed: failedCount,
      errors,
    });
  } catch (error) {
    console.error('bulkUploadFaculty error:', error);
    res.status(500).json({ message: 'Internal server error while processing file' });
  }
};

// ==========================================
// TEMPLATE DOWNLOAD
// ==========================================

export const downloadTemplate = (req: Request, res: Response): void => {
  const csvContent = 'name,email,department,phone,maxHoursPerWeek\nJohn Doe,john.doe@miet.ac.in,CSE,+919876543210,40\nJane Smith,jane.smith@miet.ac.in,ECE,,30\n';
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=faculty_template.csv');
  res.status(200).send(csvContent);
};
