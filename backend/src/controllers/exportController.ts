import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import ical, { ICalEventRepeatingFreq } from 'ical-generator';
import Timetable from '../models/Timetable';
import AuditLog from '../models/AuditLog';
import { AuthRequest } from '../middleware/auth';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PERIODS = 8;
const TYPE_COLORS: Record<string, string> = {
  THEORY: '#3b82f6',
  LAB: '#8b5cf6',
  SEMINAR: '#14b8a6',
  TUTORIAL: '#f59e0b'
};

const fetchTimetableData = async (query: any) => {
  const { timetableId, facultyId, batchId, batch, roomId, department } = query;
  
  let timetable;
  if (timetableId) {
    timetable = await Timetable.findById(timetableId)
      .populate('slots.subjectId')
      .populate('slots.facultyId')
      .populate('slots.roomId');
  } else {
    timetable = await Timetable.findOne({ status: 'PUBLISHED' })
      .sort({ createdAt: -1 })
      .populate('slots.subjectId')
      .populate('slots.facultyId')
      .populate('slots.roomId');
  }

  if (!timetable) return null;

  // Filter slots
  let filteredSlots = timetable.slots;
  if (facultyId) {
    filteredSlots = filteredSlots.filter(
      (s: any) => s.facultyId?._id?.toString() === facultyId || s.facultyId?.toString() === facultyId
    );
  }
  const batchFilter = batchId || batch;
  if (batchFilter) {
    filteredSlots = filteredSlots.filter(
      (s: any) => s.batch === batchFilter || s.batchId?.toString() === batchFilter
    );
  }
  if (roomId) {
    filteredSlots = filteredSlots.filter(
      (s: any) => s.roomId?._id?.toString() === roomId || s.roomId?.toString() === roomId
    );
  }
  if (department) {
    filteredSlots = filteredSlots.filter((s: any) => {
      const subDept = s.subjectId?.department;
      return subDept && String(subDept).toUpperCase() === String(department).toUpperCase();
    });
  }

  // Organize into grid
  const grid: any = {};
  filteredSlots.forEach((slot: any) => {
    if (!grid[slot.day]) grid[slot.day] = {};
    grid[slot.day][slot.period] = slot;
  });

  return { timetable, grid, filteredSlots };
};

export const exportTimetable = async (req: AuthRequest, res: Response) => {
  const { format } = req.query;
  const data = await fetchTimetableData(req.query);
  
  if (!data) {
    return res.status(404).json({ message: 'Timetable not found' });
  }

  const { timetable, grid, filteredSlots } = data;

  // Audit Log
  await AuditLog.create({
    action: 'EXPORT',
    entity: 'TIMETABLE',
    entityId: timetable._id,
    performedBy: req.user?.id,
    ipAddress: req.ip,
    details: { format, filters: req.query }
  });

  if (format === 'pdf') {
    return exportToPDF(res, data);
  } else if (format === 'excel') {
    return exportToExcel(res, data);
  } else if (format === 'ics') {
    return exportToICal(res, data, req.user);
  }

  res.status(400).json({ message: 'Invalid format' });
};

const exportToPDF = (res: Response, data: any) => {
  const { grid } = data;
  const doc = new PDFDocument({ layout: 'landscape', margin: 30 });
  const filename = `timetable_${Date.now()}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  doc.pipe(res);

  // Header
  doc.fontSize(20).text('Intelligent Academic Scheduling System', { align: 'center' });
  doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
  doc.moveDown(2);

  const startX = 30;
  const startY = doc.y;
  const colWidth = (doc.page.width - 60 - 50) / 6;
  const rowHeight = 60;

  // Draw Days Header
  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('Period', startX, startY);
  DAYS.forEach((day, i) => {
    doc.text(day, startX + 50 + (i * colWidth), startY, { width: colWidth, align: 'center' });
  });

  // Draw Grid
  doc.font('Helvetica');
  for (let p = 0; p < PERIODS; p++) {
    const y = startY + 20 + (p * rowHeight);
    doc.text(`P${p + 1}`, startX, y + (rowHeight / 2) - 5);
    
    for (let d = 0; d < 6; d++) {
      const x = startX + 50 + (d * colWidth);
      const slot = grid[d]?.[p];
      
      doc.rect(x, y, colWidth, rowHeight).stroke();
      
      if (slot) {
        const type = slot.subjectId?.type || 'THEORY';
        const color = TYPE_COLORS[type] || '#3b82f6';
        
        doc.save();
        doc.fillColor(color).rect(x + 1, y + 1, colWidth - 2, rowHeight - 2).fill();
        doc.fillColor('white').fontSize(8);
        doc.text(slot.subjectId?.code || '', x + 5, y + 10, { width: colWidth - 10, align: 'center' });
        doc.text(slot.roomId?.roomNumber || '', x + 5, y + 25, { width: colWidth - 10, align: 'center' });
        doc.text(slot.facultyId?.name?.split(' ').map((n:any)=>n[0]).join('') || '', x + 5, y + 40, { width: colWidth - 10, align: 'center' });
        doc.restore();
      }
    }
  }

  doc.end();
};

const exportToExcel = async (res: Response, data: any) => {
  const { grid, filteredSlots } = data;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Weekly Timetable');

  // Sheet 1: Grid
  sheet.columns = [
    { header: 'Period', key: 'period', width: 10 },
    ...DAYS.map(day => ({ header: day, key: day, width: 25 }))
  ];

  for (let p = 0; p < PERIODS; p++) {
    const rowData: any = { period: `P${p + 1}` };
    for (let d = 0; d < 6; d++) {
      const slot = grid[d]?.[p];
      if (slot) {
        rowData[DAYS[d]] = `${slot.subjectId?.code}\n${slot.roomId?.roomNumber}\n${slot.facultyId?.name}`;
      }
    }
    const row = sheet.addRow(rowData);
    row.height = 45;
    row.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
  }

  // Sheet 2: Faculty Workload
  const workloadSheet = workbook.addWorksheet('Faculty Workload');
  workloadSheet.columns = [
    { header: 'Faculty', key: 'faculty', width: 25 },
    { header: 'Subject', key: 'subject', width: 15 },
    { header: 'Day', key: 'day', width: 15 },
    { header: 'Period', key: 'period', width: 10 },
    { header: 'Room', key: 'room', width: 15 }
  ];
  filteredSlots.forEach((slot: any) => {
    workloadSheet.addRow({
      faculty: slot.facultyId?.name,
      subject: slot.subjectId?.code,
      day: DAYS[slot.day],
      period: `P${slot.period + 1}`,
      room: slot.roomId?.roomNumber
    });
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=timetable_${Date.now()}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
};

const exportToICal = (res: Response, data: any, user: any) => {
  const { filteredSlots } = data;
  const calendar = ical({ name: 'IASDS Timetable' });

  filteredSlots.forEach((slot: any) => {
    // Basic date calculation (Mocking current semester start)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + (slot.day - startDate.getDay() + 1));
    startDate.setHours(8 + slot.period, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setMinutes(55);

    calendar.createEvent({
      start: startDate,
      end: endDate,
      summary: `${slot.subjectId?.code} - ${slot.subjectId?.name}`,
      location: `Room ${slot.roomId?.roomNumber} (${slot.roomId?.building})`,
      description: `Faculty: ${slot.facultyId?.name}\nBatch: ${slot.batchId}`,
      repeating: {
        freq: ICalEventRepeatingFreq.WEEKLY,
        until: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000) // 120 days from now
      }
    });
  });

  res.setHeader('Content-Type', 'text/calendar');
  res.setHeader('Content-Disposition', 'attachment; filename=timetable.ics');
  res.send(calendar.toString());
};
