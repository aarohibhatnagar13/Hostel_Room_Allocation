/**
 * 1-generate-data.js
 * ---------------------------------------------------------
 * Generates fake student/room data matching the EXACT field
 * names your real runHostelAllocationOptimized() function
 * reads (verified against Backend/logic/allocator.js).
 *
 * USAGE:
 *   node 1-generate-data.js 300
 * ---------------------------------------------------------
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NUM_STUDENTS = parseInt(process.argv[2], 10) || 300;

// ---- Config ----
const HOSTELS = ['Hostel A', 'Hostel B', 'Hostel C', 'Hostel D'];
const ROOM_TYPES = ['Single', 'Double', 'Triple'];
const ROOMS_PER_HOSTEL_PER_TYPE = 15;
const GENDERS = ['Male', 'Female'];

const FIRST_NAMES = ['Aarav','Vivaan','Aditya','Ishaan','Kabir','Aarohi','Diya','Myra',
  'Sara','Anaya','Kiara','Ananya','Rohan','Arjun','Vihaan','Reyansh','Advait','Kavya',
  'Riya','Meera','Neha','Priya','Rahul','Karan','Nikhil','Pooja','Simran','Tanvi'];
const LAST_NAMES = ['Sharma','Verma','Gupta','Singh','Patel','Reddy','Kumar','Rao',
  'Nair','Iyer','Bhatnagar','Mehta','Joshi','Chauhan','Malhotra','Kapoor'];

function randChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randCGPA() {
  return +(6.5 + Math.random() * 3).toFixed(2);
}

// Each student ranks 3 distinct (hostel, type) combos — field
// names MUST be "hostel" and "type" to match entity.preferences
// usage in allocator.js (pref.hostel, pref.type).
function generatePreferenceList() {
  const combos = [];
  for (const hostel of HOSTELS) {
    for (const type of ROOM_TYPES) {
      combos.push({ hostel, type });
    }
  }
  for (let i = combos.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combos[i], combos[j]] = [combos[j], combos[i]];
  }
  return combos.slice(0, 3);
}

function generateStudents(n) {
  const students = [];
  for (let i = 0; i < n; i++) {
    students.push({
      id: i + 1, // numeric ID — allocator.js uses studentMap.set(s.id, ...)
      name: `${randChoice(FIRST_NAMES)} ${randChoice(LAST_NAMES)}`,
      gender: randChoice(GENDERS),
      year_of_study: 1 + Math.floor(Math.random() * 4),
      cgpa: randCGPA(),
      preferences: generatePreferenceList(),
      roommate_ids: [], // filled in below for mutual pairs
    });
  }

  // Simulate mutual roommate pairs (~15% of students).
  // IMPORTANT: allocator.js requires BOTH sides to list each
  // other's id AND matching gender, or the pair is ignored.
  const sameGenderGroups = { Male: [], Female: [] };
  students.forEach((s, idx) => sameGenderGroups[s.gender].push(idx));

  for (const gender of GENDERS) {
    const idxs = sameGenderGroups[gender];
    const pairCount = Math.floor(idxs.length * 0.15);
    const shuffled = [...idxs].sort(() => Math.random() - 0.5);
    for (let i = 0; i < pairCount - 1; i += 2) {
      const a = students[shuffled[i]];
      const b = students[shuffled[i + 1]];
      a.roommate_ids.push(b.id);
      b.roommate_ids.push(a.id);
    }
  }

  return students;
}

function generateRooms() {
  const rooms = [];
  let roomCounter = 1;
  for (const hostel of HOSTELS) {
    for (const type of ROOM_TYPES) {
      const capacity = type === 'Single' ? 1 : type === 'Double' ? 2 : 3;
      for (let i = 0; i < ROOMS_PER_HOSTEL_PER_TYPE; i++) {
        // Mix of gender-designated and 'Both' (flexible) rooms —
        // matches allocator.js's original_gender / current_gender logic
        const gender = Math.random() < 0.15 ? 'Both' : randChoice(GENDERS);
        rooms.push({
          id: roomCounter++,
          room_number: `${hostel.slice(-1)}-${100 + i}`,
          hostel_name: hostel,
          room_type: type,
          capacity: capacity,
          occupied_beds: 0,
          gender: gender,
          current_occupant_gender: null,
          allowed_years: null, // null = eligible for all years
        });
      }
    }
  }
  return rooms;
}

// ---- Run ----
const students = generateStudents(NUM_STUDENTS);
const rooms = generateRooms();
const totalCapacity = rooms.reduce((sum, r) => sum + r.capacity, 0);
const roommatePairs = students.filter(s => s.roommate_ids.length > 0).length / 2;

fs.writeFileSync(path.join(__dirname, 'students.json'), JSON.stringify(students, null, 2));
fs.writeFileSync(path.join(__dirname, 'rooms.json'), JSON.stringify(rooms, null, 2));

console.log(`Generated ${students.length} students -> students.json`);
console.log(`Generated ${rooms.length} rooms (total capacity: ${totalCapacity}) -> rooms.json`);
console.log(`Roommate pairs simulated: ${roommatePairs}`);

if (totalCapacity < students.length) {
  console.warn(
    `\n⚠️  Total capacity (${totalCapacity}) < student count (${students.length}).\n` +
    `   This is realistic (some students will be waitlisted), but if you\n` +
    `   want closer to full allocation, increase ROOMS_PER_HOSTEL_PER_TYPE.`
  );
}
