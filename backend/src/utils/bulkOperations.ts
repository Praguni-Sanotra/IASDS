import { Response } from 'express';
import * as xlsx from 'xlsx';
import AuditLog from '../models/AuditLog';

export const parseUploadedFile = (buffer: Buffer, _mimetype?: string): any[] => {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
  return rows as any[];
};

export const sendExcelTemplate = (
  res: Response,
  filename: string,
  headers: string[],
  sampleRows: (string | number)[][] = []
): void => {
  const ws = xlsx.utils.aoa_to_sheet([headers, ...sampleRows]);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Data');
  const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  res.status(200).send(buf);
};

export const sendCsvTemplate = (
  res: Response,
  filename: string,
  headers: string[],
  sampleRows: (string | number)[][] = []
): void => {
  const lines = [headers.join(','), ...sampleRows.map((r) => r.join(','))];
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  res.status(200).send(lines.join('\n'));
};

export const sendExcelExport = (
  res: Response,
  filename: string,
  headers: string[],
  rows: (string | number)[][]
): void => {
  sendExcelTemplate(res, filename, headers, rows);
};

/** Extract identifier column from spreadsheet for bulk delete */
export const extractIdsFromFile = (
  buffer: Buffer,
  idColumns: string[]
): string[] => {
  const rows = parseUploadedFile(buffer);
  const ids: string[] = [];
  for (const row of rows) {
    for (const col of idColumns) {
      const val = row[col] ?? row[col.toLowerCase()] ?? row[col.toUpperCase()];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        ids.push(String(val).trim());
        break;
      }
    }
  }
  return [...new Set(ids)];
};

export const bulkSoftDelete = async (
  Model: any,
  ids: string[],
  performedBy: string | undefined,
  ipAddress: string | undefined,
  entityName: string
) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('Please provide an array of IDs');
  }

  // Fetch only existing, active records to know which ones we are actually deleting
  const items = await Model.find({ _id: { $in: ids }, isActive: true }).select('_id');
  const foundIds = items.map((item: any) => item._id.toString());
  const notFound = ids.filter((id) => !foundIds.includes(id));

  if (foundIds.length > 0) {
    await Model.updateMany({ _id: { $in: foundIds } }, { $set: { isActive: false } });

    await AuditLog.create({
      action: 'BULK_DELETE',
      entity: entityName,
      performedBy,
      ipAddress,
      details: { deletedCount: foundIds.length, ids: foundIds },
    });
  }

  return { deleted: foundIds.length, notFound };
};
