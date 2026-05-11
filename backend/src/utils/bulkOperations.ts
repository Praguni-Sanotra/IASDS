import * as xlsx from 'xlsx';
import AuditLog from '../models/AuditLog';

export const parseUploadedFile = (buffer: Buffer, mimetype: string): any[] => {
  // Read file from buffer (works for CSV, XLSX)
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  return xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
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
