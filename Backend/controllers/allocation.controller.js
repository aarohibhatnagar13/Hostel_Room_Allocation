import db from "../models/index.js";
import { runHostelAllocation } from "../logic/allocator.js";
import lruCache from "../utils/lruCache.js";
import { asyncHandler } from "../utils/AsyncHandler.js"; // Import your utility
import { v4 as uuidv4 } from 'uuid';

/**
 * 1. RUN NEW ALLOCATION
 * Runs the priority-based greedy algorithm and saves result to LRU Cache.
 */
export const triggerAllocation = asyncHandler(async (req, res) => {
    // Fetch data from DB
    const rooms = await db.Room.findAll();
    const students = await db.Student.findAll();

    // Execute the Greedy Algorithm O(n log n)
    const result = await runHostelAllocation(rooms, students);

    // Generate ID and save to our custom LRU Cache
    const runId = uuidv4();
    lruCache.put(runId, result);

    res.status(200).json({
        success: true,
        runId,
        ...result
    });
});

/**
 * 2. GET ALLOCATION HISTORY
 * Fetches the list of cached runs (last 10) from memory.
 */
export const getAllocationHistory = asyncHandler(async (req, res) => {
    const history = lruCache.getAll();
    res.status(200).json({
        success: true,
        history
    });
});

/**
 * 3. CONFIRM ROOM BOOKING (OPTIMISTIC LOCKING)
 * Validates the version number to handle concurrency.
 */
export const confirmRoomBooking = asyncHandler(async (req, res) => {
    const { studentId, roomId, version } = req.body;

    // Use a transaction to ensure both Room and Student update together
    await db.sequelize.transaction(async (t) => {
        
        // OPTIMISTIC LOCKING:
        // We update the room ONLY if the version matches the one the student saw.
        // If 'updatedRows' is 0, it means someone else changed the room first.
        const [updatedRows] = await db.Room.update(
            { 
                occupiedBeds: db.sequelize.literal('occupiedBeds + 1'),
                version: db.sequelize.literal('version + 1') 
            },
            {
                where: {
                    id: roomId,
                    version: version, // This is the concurrency check
                    occupiedBeds: { [db.Sequelize.Op.lt]: db.sequelize.col('capacity') }
                },
                transaction: t
            }
        );

        if (updatedRows === 0) {
            // Throwing an error inside transaction automatically triggers ROLLBACK
            const error = new Error("Conflict: This room has been updated by another user. Please refresh.");
            error.statusCode = 409;
            throw error;
        }

        // Assign the room to the student
        await db.Student.update(
            { allocatedRoomId: roomId },
            { where: { id: studentId }, transaction: t }
        );
    });

    res.status(200).json({
        success: true,
        message: "Room confirmed and allocated successfully!"
    });
});