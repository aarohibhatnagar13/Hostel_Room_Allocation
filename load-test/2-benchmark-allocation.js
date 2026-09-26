/**
 * 2-benchmark-allocation.js
 * ---------------------------------------------------------
 * Runs your REAL allocation algorithm (runHostelAllocationOptimized
 * from Backend/logic/allocator.js) against generated fake data
 * and measures real wall-clock execution time.
 *
 * This version is wired to your actual code, based on your
 * allocation.controller.js:
 *   - Function: runHostelAllocationOptimized(rooms, students)
 *     NOTE the order: rooms FIRST, then students.
 *   - Returns: { results: { allocations: [...], waitlist: [...] } }
 *
 * Your project uses ES Modules (import/export), so this script
 * uses import syntax too — not require().
 *
 * USAGE:
 *   node 2-benchmark-allocation.js
 * ---------------------------------------------------------
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { performance } from 'perf_hooks';
import { runHostelAllocationOptimized } from '../Backend/logic/allocator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------
// STEP 1: Load generated test data
// ---------------------------------------------------------
const students = JSON.parse(fs.readFileSync(path.join(__dirname, 'students.json'), 'utf-8'));
const rooms = JSON.parse(fs.readFileSync(path.join(__dirname, 'rooms.json'), 'utf-8'));

console.log(`Loaded ${students.length} students and ${rooms.length} rooms.`);
console.log('Running allocation algorithm (runHostelAllocationOptimized)...\n');

// ---------------------------------------------------------
// NOTE ON DATA SHAPE:
// Your real function expects rooms/students shaped like what
// Sequelize's findAll({ raw: true }) returns — i.e. flat DB
// row objects. Our generated students.json / rooms.json use
// slightly different field names (e.g. "student_id" vs your
// real "id", "roll_number" vs whatever your Student model
// actually calls it, nested "preferences" array vs however
// your real schema stores ranked preferences).
//
// If the algorithm throws or silently returns 0 allocations,
// the #1 suspect is a field-name mismatch between our fake
// data and what allocator.js actually expects to read.
// Check allocator.js's field references (e.g. student.cgpa,
// student.gender, room.capacity, room.occupied_beds) and
// adjust 1-generate-data.js field names to match EXACTLY.
// ---------------------------------------------------------

(async () => {
  const startTime = performance.now();

  let result;
  try {
    // ⚠️ Order matters: rooms first, students second — matches
    // your real controller's call: runHostelAllocationOptimized(rooms, students)
    result = await runHostelAllocationOptimized(rooms, students);
  } catch (e) {
    console.error('❌ Allocation function threw an error:', e.message);
    console.error(
      '\nMost likely cause: field-name mismatch between generated fake data\n' +
      'and what allocator.js expects (e.g. it expects "id" but we generated\n' +
      '"student_id", or it expects "occupied_beds" but rooms.json has "occupied").\n' +
      'Open Backend/logic/allocator.js and check exactly which field names\n' +
      'it reads off each student/room object, then align 1-generate-data.js.\n'
    );
    process.exit(1);
  }

  const endTime = performance.now();
  const totalTimeMs = endTime - startTime;

  // Your real result shape: { results: { allocations: [...], waitlist: [...] } }
  const allocations = result?.results?.allocations ?? [];
  const waitlist = result?.results?.waitlist ?? [];
  const avgTimePerStudentMs = totalTimeMs / students.length;

  const summary = {
    total_students: students.length,
    total_rooms: rooms.length,
    allocated_count: allocations.length,
    waitlisted_count: waitlist.length,
    total_time_ms: +totalTimeMs.toFixed(3),
    avg_time_per_student_ms: +avgTimePerStudentMs.toFixed(4),
    timestamp: new Date().toISOString(),
  };

  console.log('=== ALLOCATION BENCHMARK RESULTS ===');
  console.log(`Students processed:     ${summary.total_students}`);
  console.log(`Allocated:              ${summary.allocated_count}`);
  console.log(`Waitlisted:             ${summary.waitlisted_count}`);
  console.log(`Total time:             ${summary.total_time_ms} ms`);
  console.log(`Avg time per student:   ${summary.avg_time_per_student_ms} ms`);
  console.log('=====================================\n');

  if (allocations.length === 0 && waitlist.length === 0) {
    console.warn(
      '⚠️  WARNING: 0 allocations AND 0 waitlisted — this almost certainly\n' +
      '   means the algorithm didn\'t recognize the input data correctly.\n' +
      '   Don\'t trust the timing number above until this is fixed.\n' +
      '   Check field-name alignment as noted above.\n'
    );
  }

  fs.writeFileSync(
    path.join(__dirname, 'results.json'),
    JSON.stringify({ summary, sampleAllocations: allocations.slice(0, 5) }, null, 2)
  );
  console.log('Full summary saved to results.json');
})();
