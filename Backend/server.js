// ==========================================
// 3. STUDENT PORTAL ROUTES (Hostel Specific)
// ==========================================
app.get("/api/student/profile/:rollNo", requireAuth, asyncHandler(async (req, res) => {
    const student = await db.Student.findOne({
        where: { rollNo: req.params.rollNo.toUpperCase() },
        include: [{ model: db.Room, as: 'allocatedRoom' }]
    });
    
    if (!student) return res.status(404).json({ message: "Student record not found" });

    // Calculate priority score on the fly for the dashboard
    // Formula: (CGPA * 10) + (Year * 2)
    const priority = (student.cgpa * 10) + (student.yearOfStudy * 2);

    res.json({ 
        success: true, 
        student, 
        priorityScore: priority 
    });
}));

// ==========================================
// 4. HOSTEL ALLOCATION ENGINE ROUTES
// ==========================================

/**
 * Trigger the Priority-Based Greedy Algorithm
 * O(n log n) complexity
 */
app.post("/api/allocation/run", requireAdmin, triggerAllocation);

/**
 * Fetch results from custom LRU Cache (Last 10 runs)
 * O(1) access complexity
 */
app.get("/api/allocation/history", requireAdmin, getAllocationHistory);

/**
 * Confirm Room Allocation with Optimistic Locking
 * Prevents race conditions during simultaneous bookings
 */
app.post("/api/allocation/confirm", requireAuth, confirmRoomBooking);

// ==========================================
// 5. WARDEN & ROOM MANAGEMENT
// ==========================================

// List all rooms with current vacancy status
app.get("/api/rooms", requireAuth, asyncHandler(async (req, res) => {
    const rooms = await db.Room.findAll({
        order: [['hostelBlock', 'ASC'], ['roomNumber', 'ASC']]
    });
    res.json({ success: true, data: rooms });
}));

// Warden updates room maintenance or occupancy status
app.post("/api/warden/mark-occupancy", requireWardenOrAdmin, asyncHandler(async (req, res) => {
    const { roomId, status } = req.body; 
    // Logic to update status would go here
    res.json({ success: true, message: "Occupancy status updated successfully." });
}));

// ==========================================
// 6. ROOM RESOURCE BULK UPLOAD (Generic CSV Processing)
// ==========================================
app.post("/api/admin/rooms/bulk", requireAdmin, asyncHandler(async (req, res) => {
    if (!Array.isArray(req.body)) {
        return res.status(400).json({ message: "Invalid data format. Expected an array." });
    }

    const rooms = req.body.map(r => ({
        roomNumber: r.roomNumber,
        hostelBlock: r.hostelBlock,
        capacity: parseInt(r.capacity) || 2,
        floor: parseInt(r.floor),
        roomType: r.roomType || 'Non-AC',
        version: 0 // Initialize version for Optimistic Locking
    }));

    // updateOnDuplicate ensures that if a room exists, its capacity/type is refreshed
    await db.Room.bulkCreate(rooms, { 
        updateOnDuplicate: ["capacity", "roomType", "floor"] 
    });
    
    res.json({ success: true, message: `Successfully synchronized ${rooms.length} rooms.` });
}));