import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { connectDB } from '../config/db';
import User, { UserRole } from '../models/User';
import Faculty, { DayOfWeek } from '../models/Faculty';
import Subject, { SubjectType } from '../models/Subject';
import Room, { RoomType } from '../models/Room';
import Constraint, { ConstraintType } from '../models/Constraint';

// Load env vars if running standalone
dotenv.config();

const seedDatabase = async () => {
  try {
    await connectDB();

    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await Faculty.deleteMany({});
    await Subject.deleteMany({});
    await Room.deleteMany({});
    await Constraint.deleteMany({});

    console.log('🌱 Seeding Admin User...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Admin@123', salt);

    const adminUser = await User.create({
      name: 'System Admin',
      email: 'admin@miet.ac.in',
      password: hashedPassword,
      role: UserRole.ADMIN,
      department: 'ADMINISTRATION',
    });

    console.log('🌱 Seeding Faculty...');
    const facultiesData = [
      { name: 'Dr. Alan Turing', email: 'alan.turing@miet.ac.in', empId: 'EMP001' },
      { name: 'Dr. Ada Lovelace', email: 'ada.lovelace@miet.ac.in', empId: 'EMP002' },
      { name: 'Prof. Grace Hopper', email: 'grace.hopper@miet.ac.in', empId: 'EMP003' },
      { name: 'Dr. John von Neumann', email: 'john.neumann@miet.ac.in', empId: 'EMP004' },
      { name: 'Prof. Donald Knuth', email: 'donald.knuth@miet.ac.in', empId: 'EMP005' },
    ];

    const facultyUsers = [];
    const faculties = [];

    for (const fac of facultiesData) {
      const user = await User.create({
        name: fac.name,
        email: fac.email,
        password: hashedPassword, // Default password for seeding
        role: UserRole.FACULTY,
        department: 'CSE',
      });
      facultyUsers.push(user);

      const faculty = await Faculty.create({
        userId: user._id,
        employeeId: fac.empId,
        name: fac.name,
        email: fac.email,
        department: 'CSE',
        availability: [
          { day: DayOfWeek.MON, availableSlots: [1, 2, 3, 4, 5, 6] },
          { day: DayOfWeek.TUE, availableSlots: [1, 2, 3, 4, 5, 6] },
          { day: DayOfWeek.WED, availableSlots: [1, 2, 3, 4, 5, 6] },
          { day: DayOfWeek.THU, availableSlots: [1, 2, 3, 4, 5, 6] },
          { day: DayOfWeek.FRI, availableSlots: [1, 2, 3, 4, 5, 6] },
          { day: DayOfWeek.SAT, availableSlots: [1, 2, 3, 4, 5, 6] },
        ],
        maxHoursPerWeek: 16,
      });
      faculties.push(faculty);
    }

    console.log('🌱 Seeding Subjects...');
    const subjects = [];
    const facultyLoad: Record<string, number> = {};
    for (let i = 1; i <= 20; i++) {
      const isLab = i % 4 === 0;
      const semester = (i % 8) + 1;
      // Distribute subjects across faculty by lowest current load
      const assignedFaculty = [...faculties].sort(
        (a, b) => (facultyLoad[a._id.toString()] || 0) - (facultyLoad[b._id.toString()] || 0)
      )[0];
      const hours = isLab ? 2 : 3;
      facultyLoad[assignedFaculty._id.toString()] = (facultyLoad[assignedFaculty._id.toString()] || 0) + hours;

      subjects.push({
        code: `CS${100 + i}`,
        name: isLab ? `Computer Science Lab ${i}` : `Computer Science Theory ${i}`,
        credits: isLab ? 2 : 3,
        hoursPerWeek: hours,
        type: isLab ? SubjectType.LAB : SubjectType.THEORY,
        department: 'CSE',
        semester,
        eligibleFaculty: [assignedFaculty._id],
      });
    }
    const insertedSubjects = await Subject.insertMany(subjects);

    // Sync subjectsTaught on faculty records
    for (const sub of insertedSubjects) {
      await Faculty.findByIdAndUpdate(sub.eligibleFaculty[0], {
        $push: { subjectsTaught: { subjectId: sub._id, isPrimary: true } },
      });
    }

    console.log('🌱 Seeding Rooms...');
    const rooms = [];
    for (let i = 1; i <= 10; i++) {
      const isLab = i > 7;
      rooms.push({
        roomNumber: isLab ? `LAB-${i}` : `L-${i}`,
        building: 'BLOCK A',
        floor: isLab ? 1 : 2,
        type: isLab ? RoomType.LAB : RoomType.LECTURE,
        capacity: isLab ? 30 : 60,
        facilities: isLab ? ['Computers', 'Projector'] : ['Projector', 'Whiteboard'],
        availability: [],
      });
    }
    await Room.insertMany(rooms);

    console.log('🌱 Seeding Constraints...');
    const constraints = [
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
    await Constraint.insertMany(constraints);

    console.log('✅ Seeding completed successfully!');
    console.log('Summary:');
    console.log(`- Users: ${1 + facultiesData.length}`);
    console.log(`- Faculty: ${facultiesData.length}`);
    console.log(`- Subjects: ${subjects.length}`);
    console.log(`- Rooms: ${rooms.length}`);
    console.log(`- Constraints: ${constraints.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();
