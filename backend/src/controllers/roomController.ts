import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import Room from '../models/Room';
import AuditLog from '../models/AuditLog';
import { AuthRequest } from '../middleware/auth';
import mongoose from 'mongoose';
import {
  parseUploadedFile,
  bulkSoftDelete,
  sendExcelTemplate,
  sendCsvTemplate,
  sendExcelExport,
  extractIdsFromFile,
} from '../utils/bulkOperations';
import logger from '../utils/logger';

export const getAllRooms = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const type = req.query.type as string;
    const minCapacity = parseInt(req.query.minCapacity as string);

    const query: any = { isActive: true };

    if (search) {
      query.$or = [
        { roomNumber: { $regex: search, $options: 'i' } },
        { building: { $regex: search, $options: 'i' } },
      ];
    }
    if (type) query.type = type;
    if (minCapacity && !isNaN(minCapacity)) query.capacity = { $gte: minCapacity };

    const total = await Room.countDocuments(query);
    const rooms = await Room.find(query)
      .sort({ roomNumber: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      data: rooms,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getRoomById = async (req: Request, res: Response): Promise<void> => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room || !room.isActive) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }
    res.json({ data: room });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createRoom = async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ message: 'Validation Error', errors: errors.array() }) as any;

  try {
    const existing = await Room.findOne({ roomNumber: req.body.roomNumber.toUpperCase() });
    if (existing) {
      res.status(400).json({ message: 'Room number already exists' });
      return;
    }

    const room = await Room.create({ ...req.body, roomNumber: req.body.roomNumber.toUpperCase() });

    await AuditLog.create({
      action: 'CREATE',
      entity: 'ROOM',
      entityId: room._id,
      performedBy: req.user?.id,
      ipAddress: req.ip,
      details: { roomNumber: room.roomNumber },
    });

    res.status(201).json({ message: 'Room created', data: room });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateRoom = async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ message: 'Validation Error', errors: errors.array() }) as any;

  try {
    const room = await Room.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!room) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    await AuditLog.create({
      action: 'UPDATE',
      entity: 'ROOM',
      entityId: room._id,
      performedBy: req.user?.id,
      ipAddress: req.ip,
      details: { updatedFields: Object.keys(req.body) },
    });

    res.json({ message: 'Room updated', data: room });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteRoom = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    room.isActive = false;
    await room.save();

    await AuditLog.create({
      action: 'DELETE',
      entity: 'ROOM',
      entityId: room._id,
      performedBy: req.user?.id,
      ipAddress: req.ip,
      details: { roomNumber: room.roomNumber },
    });

    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const bulkDeleteRooms = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await bulkSoftDelete(Room, req.body.ids, req.user?.id, req.ip, 'ROOM');
    if (result.deleted === 0) {
      res.status(404).json({ message: 'No matching active records found', notFound: result.notFound });
      return;
    }
    res.json({ message: 'Bulk delete operation completed', ...result });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const bulkUploadRooms = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const data = parseUploadedFile(req.file.buffer, req.file.mimetype);
    let successCount = 0;
    let failedCount = 0;
    const errors: Array<{ row: number; reason: string }> = [];

    const existingRoomsRaw = await Room.find().select('roomNumber');
    const existingRooms = new Set(
      existingRoomsRaw
        .filter((s) => s.roomNumber)
        .map((s) => s.roomNumber.toUpperCase())
    );

    const validRows = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2;

      let { roomNumber, building, floor, type, capacity, facilities } = row;

      if (!roomNumber || !building || floor === undefined || !type || capacity === undefined) {
        failedCount++;
        errors.push({ row: rowNumber, reason: 'Missing required fields (roomNumber, building, floor, type, capacity)' });
        continue;
      }

      // Validate Room Type
      const upperType = String(type).toUpperCase();
      if (!['LECTURE', 'LAB', 'SEMINAR', 'CONFERENCE'].includes(upperType)) {
        failedCount++;
        errors.push({ row: rowNumber, reason: `Invalid room type: ${type}. Must be LECTURE, LAB, SEMINAR, or CONFERENCE.` });
        continue;
      }

      // Validate Numeric fields
      const parsedFloor = parseInt(floor);
      const parsedCapacity = parseInt(capacity);

      if (isNaN(parsedFloor) || isNaN(parsedCapacity)) {
        failedCount++;
        errors.push({ row: rowNumber, reason: 'Floor and Capacity must be numeric values' });
        continue;
      }

      const upperRoomNumber = String(roomNumber).toUpperCase();
      if (existingRooms.has(upperRoomNumber)) {
        failedCount++;
        errors.push({ row: rowNumber, reason: `Room number ${roomNumber} already exists` });
        continue;
      }

      existingRooms.add(upperRoomNumber);

      // Parse comma separated facilities
      const parsedFacilities = facilities && typeof facilities === 'string'
        ? facilities.split(',').map((f) => f.trim())
        : (Array.isArray(facilities) ? facilities : []);

      validRows.push({
        roomNumber: upperRoomNumber,
        building,
        floor: parsedFloor,
        type: upperType,
        capacity: parsedCapacity,
        facilities: parsedFacilities,
      });
    }

    if (validRows.length > 0) {
      await Room.insertMany(validRows, { ordered: false });
      successCount = validRows.length;
    }

    await AuditLog.create({
      action: 'BULK_UPLOAD',
      entity: 'ROOM',
      performedBy: req.user?.id,
      ipAddress: req.ip,
      details: { file: req.file.originalname, successCount, failedCount },
    });

    res.json({ success: successCount, failed: failedCount, errors });
  } catch (error) {
    logger.error('bulkUploadRooms error:', error);
    res.status(500).json({ message: 'Internal server error while processing file' });
  }
};

export const downloadTemplate = (req: Request, res: Response): void => {
  const format = (req.query.format as string) || 'xlsx';
  const headers = ['roomNumber', 'building', 'floor', 'type', 'capacity', 'facilities'];
  const sample = [['L-101', 'Block A', 1, 'LECTURE', 60, 'Projector, Whiteboard']];
  if (format === 'csv') {
    sendCsvTemplate(res, 'room_template.csv', headers, sample);
  } else {
    sendExcelTemplate(res, 'room_template.xlsx', headers, sample);
  }
};

export const exportRooms = async (req: Request, res: Response): Promise<void> => {
  try {
    const rooms = await Room.find({ isActive: true }).sort({ roomNumber: 1 });
    const headers = ['roomNumber', 'building', 'floor', 'type', 'capacity', 'facilities'];
    const rows = rooms.map((r) => [
      r.roomNumber,
      r.building || '',
      r.floor ?? '',
      r.type,
      r.capacity,
      (r.facilities || []).join(', '),
    ]);
    sendExcelExport(res, 'rooms_export.xlsx', headers, rows);
  } catch {
    res.status(500).json({ message: 'Export failed' });
  }
};

export const bulkDeleteRoomsFromFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }
    const identifiers = extractIdsFromFile(req.file.buffer, ['roomNumber', '_id', 'id']);
    const objectIds = identifiers.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const rooms = await Room.find({
      isActive: true,
      $or: [
        { roomNumber: { $in: identifiers } },
        ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
      ],
    });
    const ids = rooms.map((r) => r._id.toString());
    if (!ids.length) {
      res.status(404).json({ message: 'No matching rooms found' });
      return;
    }
    const result = await bulkSoftDelete(Room, ids, req.user?.id, req.ip, 'ROOM');
    res.json({ message: 'Bulk delete from file completed', ...result });
  } catch {
    res.status(500).json({ message: 'Bulk delete failed' });
  }
};
