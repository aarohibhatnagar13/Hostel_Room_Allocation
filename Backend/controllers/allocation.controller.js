import db from "../models/index.js";
import { runHostelAllocationOptimized } from "../logic/allocator.js";
import lruCache from "../utils/lruCache.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { v4 as uuidv4 } from 'uuid';

export const triggerAllocation = asyncHandler(async (req, res) => {
    // 1. Fetch unallocated students and all rooms
    const rooms = await db.Room.findAll({ raw: true });
    const students = await db.Student.findAll({ 
        where: { allocation_status: 'unallocated' },
        raw: true 
    });

    if (students.length === 0) {
        return res.status(400).json({ success: false, message: "No unallocated students found." });
    }

    // 2. Run the Engine!
    const result = await runHostelAllocationOptimized(rooms, students);

    // 3. Save the actual results to the Database (in a transaction for safety)
    await db.sequelize.transaction(async (t) => {
        // Update Allocated Students
        for (const alloc of result.results.allocations) {
            await db.Student.update(
                { allocated_room_id: alloc.room_id, allocation_status: 'allocated' },
                { where: { id: alloc.student_id }, transaction: t }
            );
            // Update Room Occupancy and Gender Lock
            await db.Room.increment('occupied_beds', { by: 1, where: { id: alloc.room_id }, transaction: t });
            await db.Room.update(
                { current_occupant_gender: alloc.room_gender }, 
                { where: { id: alloc.room_id }, transaction: t }
            );
        }

        // Update Waitlisted Students
        for (const wait of result.results.waitlist) {
            await db.Student.update(
                { allocation_status: 'waitlisted' },
                { where: { id: wait.student_id }, transaction: t }
            );
        }
    });

    // 4. Cache it for the history page
    const runId = uuidv4();
    lruCache.put(runId, result);

    res.status(200).json({ success: true, runId, ...result });
});

export const getAllocationHistory = asyncHandler(async (req, res) => {
    const history = lruCache.getAll();
    res.status(200).json({ success: true, history });
});

export const confirmRoomBooking = asyncHandler(async (req, res) => {
    const { studentId, roomId, version } = req.body;
    await db.sequelize.transaction(async (t) => {
        const [updatedRows] = await db.Room.update(
            { version: db.sequelize.literal('version + 1') },
            { where: { id: roomId, version: version }, transaction: t }
        );
        if (updatedRows === 0) {
            const error = new Error("Conflict: Room updated by another user. Please refresh.");
            error.statusCode = 409;
            throw error;
        }
        await db.Student.update(
            { allocation_status: 'confirmed' },
            { where: { id: studentId }, transaction: t }
        );
    });
    res.status(200).json({ success: true, message: "Room confirmed!" });
});