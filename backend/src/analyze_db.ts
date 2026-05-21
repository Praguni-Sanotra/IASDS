import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Faculty from './models/Faculty';
import Subject from './models/Subject';
import Room from './models/Room';

async function analyze() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/iasds';
    await mongoose.connect(mongoUri);
    console.log(`Connected to DB: ${mongoUri}`);

    // Analyze CSE Semester 3 (as seen in the logs where it failed)
    const dept = 'CSE';
    const sem = 3;

    const subjects = await Subject.find({ department: dept, semester: sem, isActive: true });
    const faculty = await Faculty.find({ department: dept, isActive: true });
    const allFaculty = await Faculty.find({ isActive: true });
    const rooms = await Room.find({ isActive: true });

    console.log(`\n======================================================`);
    console.log(`--- ANALYSIS FOR ${dept} SEM ${sem} ---`);
    console.log(`======================================================\n`);

    let totalHours = 0;
    let labHours = 0;

    console.log(`SUBJECTS (${subjects.length} total):`);
    for (const s of subjects) {
      totalHours += s.hoursPerWeek;
      if (s.type === 'LAB') labHours += s.hoursPerWeek;

      console.log(`  - [${s.code}] ${s.name} | Type: ${s.type} | Hours: ${s.hoursPerWeek} | Assigned Faculty: ${s.eligibleFaculty?.length || 0}`);

      if (!s.eligibleFaculty || s.eligibleFaculty.length === 0) {
        console.log(`      -> ⚠️ CRITICAL: NO FACULTY ASSIGNED!`);
      } else {
        // Check if assigned faculty exist and are active
        for (const fid of s.eligibleFaculty) {
          const f = allFaculty.find(f => f._id.toString() === fid.toString());
          if (!f) {
            console.log(`      -> ⚠️ CRITICAL: Mapped faculty ${fid} does not exist or is inactive!`);
          }
        }
      }
    }

    console.log(`\n======================================================`);
    console.log(`CAPACITY CHECKS:`);
    console.log(`  Total Required Hours : ${totalHours} (Max 36)`);
    if (totalHours > 36) {
      console.log(`  -> ⚠️ CRITICAL: IMPOSSIBLE SCHEDULE. Required hours (${totalHours}) exceeds available slots (36).`);
    }

    console.log(`  Total Lab Hours      : ${labHours}`);
    const labRooms = rooms.filter(r => r.type === 'LAB');
    console.log(`  Available Lab Rooms  : ${labRooms.length}`);
    if (labHours > 0 && labRooms.length === 0) {
      console.log(`  -> ⚠️ CRITICAL: Lab subjects exist but 0 Lab rooms are configured.`);
    }

    const theoryRooms = rooms.filter(r => r.type === 'LECTURE' || r.type === 'THEORY');
    console.log(`  Available Theory Rms : ${theoryRooms.length}`);

    console.log(`\n======================================================`);
    console.log(`FACULTY WORKLOAD (${dept} Dept):`);
    console.log(`  Total Dept Faculty   : ${faculty.length}`);
    let totalFacCapacity = 0;
    for (const f of faculty) {
      totalFacCapacity += f.maxHoursPerWeek;

      // Calculate availability slots
      let availSlots = 0;
      for (const a of f.availability) {
        availSlots += a.availableSlots.length;
      }

      // console.log(`  - ${f.name} | Max: ${f.maxHoursPerWeek} | Usable Avail Slots: ${availSlots}`);
      if (availSlots < f.maxHoursPerWeek) {
        // console.log(`      -> ⚠️ WARNING: ${f.name} max load is ${f.maxHoursPerWeek} but only has ${availSlots} slots available!`);
      }
    }
    console.log(`  Total Dept Capacity  : ${totalFacCapacity} hours`);
    if (totalHours > totalFacCapacity) {
      console.log(`  -> ⚠️ CRITICAL: Required hours (${totalHours}) exceeds total faculty capacity (${totalFacCapacity}).`);
    }

    console.log(`\n======================================================`);
    console.log(`GLOBAL ROOM SUMMARY:`);
    rooms.forEach(r => {
      console.log(`  - [${r.type}] ${r.roomNumber} (Cap: ${r.capacity})`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

analyze();
