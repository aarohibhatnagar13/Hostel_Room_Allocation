/**
 * Room and Student Wrappers to handle in-memory logic during allocation
 */
class RoomWrapper {
    constructor(dbRoom) {
        this.id = dbRoom.id;
        this.room_number = dbRoom.room_number;
        this.block = dbRoom.hostel_block;
        this.floor = dbRoom.floor;
        this.type = dbRoom.room_type;
        this.capacity = dbRoom.capacity;
        this.occupied = dbRoom.occupied_beds || 0;
    }

    hasSpace() {
        return this.occupied < this.capacity;
    }

    occupy() {
        if (this.hasSpace()) {
            this.occupied++;
            return true;
        }
        return false;
    }
}

/**
 * CORE ALLOCATION ALGORITHM
 * Strategy: Priority-Based Greedy Allocation
 * Time Complexity: O(n log n) for Sorting + O(n * k) for Allocation 
 * (where n = students, k = room search/filtering)
 */
export const runHostelAllocation = async (dbRooms, dbStudents) => {
    // 1. Wrap data for easier manipulation
    const rooms = dbRooms.map(r => new RoomWrapper(r));
    
    // 2. Calculate Priority Scores and Sort
    // Formula: priority_score = (CGPA * 10) + (Year * 2)
    const students = dbStudents.map(s => ({
        ...s,
        priority_score: (parseFloat(s.cgpa) * 10) + (parseInt(s.year_of_study) * 2)
    }));

    // Sort students by priority descending: O(n log n)
    students.sort((a, b) => b.priority_score - a.priority_score);

    const allocations = [];
    const waitlist = [];

    // 3. GREEDY ITERATION: O(n)
    for (const student of students) {
        // Handle Edge Case: Student has missing preference data
        if (!student.preferred_block || !student.ac_preference) {
            waitlist.push({
                student_id: student.id,
                name: student.name,
                reason: "Incomplete preference data"
            });
            continue;
        }

        // Find the FIRST available room matching ALL preferences
        // In a complex system, "k" would be multiple ranked preferences. 
        // Here we check their primary preference set.
        const targetRoom = rooms.find(r => 
            r.hasSpace() &&
            r.block === student.preferred_block &&
            r.floor === student.preferred_floor &&
            r.type === student.ac_preference
        );

        if (targetRoom) {
            // Assign student to room
            targetRoom.occupy();
            allocations.push({
                student_id: student.id,
                student_name: student.name,
                priority: student.priority_score,
                room_id: targetRoom.id,
                room_number: targetRoom.room_number,
                block: targetRoom.block
            });
        } else {
            // Edge Case: Room full or no match found
            waitlist.push({
                student_id: student.id,
                name: student.name,
                priority: student.priority_score,
                reason: "No available rooms matching preferences"
            });
        }
    }

    // 4. Return results for the Caching Layer
    return {
        timestamp: new Date().toISOString(),
        results: {
            allocations,
            waitlist,
            stats: {
                total_processed: students.length,
                successfully_allocated: allocations.length,
                waitlisted: waitlist.length,
                occupancy_rate: `${((allocations.length / dbRooms.reduce((acc, r) => acc + r.capacity, 0)) * 100).toFixed(2)}%`
            }
        }
    };
};