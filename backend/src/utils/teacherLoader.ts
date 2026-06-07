import mongoose from 'mongoose';
import Faculty from '../models/Faculty';

const DEPT_ALIASES: Record<string, string[]> = {
  CSE: ['computer science and engineering', 'computer science & engineering'],
  ECE: ['electronics and communication', 'electronics & communication'],
  CIVIL: ['civil engineering'],
  EEE: ['electrical engineering'],
  MECH: ['mechanical engineering'],
  IT: ['information technology'],
  AIDS: ['artificial intelligence', 'data science'],
  AIML: ['machine learning', 'aiml'],
  MCA: ['computer applications'],
  BCA: ['computer applications'],
  BBA: ['management', 'business'],
  LAW: ['law'],
  AS: ['applied sciences', 'applied science'],
};

export async function getTeachersCollection() {
  return mongoose.connection.db!.collection('teachers');
}

export async function countTeachers(): Promise<number> {
  try {
    const col = await getTeachersCollection();
    return col.countDocuments({});
  } catch {
    return 0;
  }
}

export async function resolveDepartmentObjectIds(deptCode: string): Promise<mongoose.Types.ObjectId[]> {
  const db = mongoose.connection.db!;
  const depts = await db.collection('departments').find({}).toArray();
  const code = deptCode.toUpperCase().trim();

  if (!depts.length) return [];

  for (const d of depts) {
    const short = String(d.code || d.shortCode || '').toUpperCase();
    if (short === code) return [d._id as mongoose.Types.ObjectId];
  }

  const aliases = DEPT_ALIASES[code] || [code.toLowerCase()];
  const matched: mongoose.Types.ObjectId[] = [];
  for (const d of depts) {
    const name = String(d.name || d.departmentName || '').toLowerCase();
    if (aliases.some((alias) => name.includes(alias))) {
      matched.push(d._id as mongoose.Types.ObjectId);
    }
  }
  return matched;
}

/** Shape teachers like Faculty documents for the frontend */
export function mapTeacherToFacultyShape(teacher: any, deptLabel?: string) {
  return {
    _id: teacher._id,
    name: teacher.name,
    email: teacher.email,
    employeeId: teacher.employeeId || teacher.email || String(teacher._id),
    department: deptLabel || teacher.departmentCode || '—',
    designation: teacher.designation,
    maxHoursPerWeek: teacher.maxHoursPerWeek || teacher.maxHoursMs || teacher.maxHours || 20,
    isActive: teacher.status === 'active' || teacher.status === 'ACTIVE' || teacher.isActive !== false,
    subjectsTaught: teacher.subjectsTaught || [],
    availability: teacher.availability || [],
    source: 'teachers',
  };
}

export async function fetchTeachersAsFaculty(options: {
  department?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const col = await getTeachersCollection();
  const { department, search, page = 1, limit = 20 } = options;

  const query: Record<string, unknown> = {
    $or: [{ status: 'active' }, { status: 'ACTIVE' }, { status: { $exists: false } }, { isActive: true }],
  };

  if (department) {
    const deptIds = await resolveDepartmentObjectIds(department);
    if (deptIds.length) {
      query.department = { $in: deptIds };
    }
  }

  if (search) {
    query.$and = [
      {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { designation: { $regex: search, $options: 'i' } },
        ],
      },
    ];
  }

  const total = await col.countDocuments(query);
  const teachers = await col
    .find(query)
    .sort({ name: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray();

  return {
    data: teachers.map((t) => mapTeacherToFacultyShape(t, department)),
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

function toPlainSlot(slot: any) {
  if (!slot) return slot;
  if (typeof slot.toObject === 'function') return slot.toObject();
  return { ...slot };
}

/**
 * Resolve slot.facultyId from teachers collection first, then legacy faculties.
 * Returns plain slot objects safe for JSON (Mongoose subdoc mutations do not serialize).
 */
export async function enrichSlotsWithTeachers(slots: any[]): Promise<any[]> {
  if (!slots?.length) return [];

  const plainSlots = slots.map(toPlainSlot);
  const idsToResolve = new Set<string>();

  for (const slot of plainSlots) {
    if (slot.facultyId && typeof slot.facultyId === 'object' && slot.facultyId.name) {
      slot.facultyName = slot.facultyId.name;
      continue;
    }
    const rawId = slot.facultyId?._id || slot.facultyId;
    if (rawId) idsToResolve.add(String(rawId));
  }

  const teacherMap = new Map<string, ReturnType<typeof mapTeacherToFacultyShape>>();
  const facultyMap = new Map<string, any>();

  if (idsToResolve.size > 0) {
    const teacherCount = await countTeachers();
    if (teacherCount > 0) {
      const col = await getTeachersCollection();
      const objectIds = [...idsToResolve]
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
      const teachers = await col.find({ _id: { $in: objectIds } }).toArray();
      teachers.forEach((t) => teacherMap.set(String(t._id), mapTeacherToFacultyShape(t)));
    }

    const unresolved = [...idsToResolve].filter((id) => !teacherMap.has(id));
    if (unresolved.length) {
      const faculties = await Faculty.find({ _id: { $in: unresolved } }).lean();
      faculties.forEach((f: any) => facultyMap.set(String(f._id), f));
    }
  }

  for (const slot of plainSlots) {
    if (slot.facultyId && typeof slot.facultyId === 'object' && slot.facultyId.name) {
      slot.facultyName = slot.facultyId.name;
      continue;
    }

    const idStr = String(slot.facultyId?._id || slot.facultyId || '');
    if (!idStr) continue;

    if (teacherMap.has(idStr)) {
      slot.facultyId = teacherMap.get(idStr);
      slot.facultyName = slot.facultyId!.name;
    } else if (facultyMap.has(idStr)) {
      slot.facultyId = facultyMap.get(idStr);
      slot.facultyName = slot.facultyId.name;
    }
  }

  return plainSlots;
}
