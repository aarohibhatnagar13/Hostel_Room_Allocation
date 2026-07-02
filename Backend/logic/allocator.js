class RoomWrapper {
    constructor(dbRoom) {
        this.id = dbRoom.id;
        this.room_number = dbRoom.room_number;
        this.hostel_name = dbRoom.hostel_name;
        this.type = dbRoom.room_type;
        this.capacity = parseInt(dbRoom.capacity);
        this.occupied = parseInt(dbRoom.occupied_beds) || 0;
        
        this.original_gender = dbRoom.gender; 
        this.current_gender = (this.occupied > 0 && dbRoom.current_occupant_gender) 
            ? dbRoom.current_occupant_gender : this.original_gender; 
        this.allowed_years = dbRoom.allowed_years || null; 
    }
    availableBeds() { return this.capacity - this.occupied; }
    hasSpaceFor(size) { return this.availableBeds() >= size; }
    isEligible(studentYearsArray) {
        if (!this.allowed_years || this.allowed_years.length === 0) return true;
        return studentYearsArray.every(year => this.allowed_years.map(String).includes(String(year))); 
    }
}

class AllocationEntity {
    constructor(students) {
        this.students = students;
        this.size = students.length;
        this.gender = students[0].gender; 
        this.preferences = students[0].preferences || [];
        this.years = students.map(s => s.year_of_study);
        
        const totalYear = students.reduce((sum, s) => sum + parseInt(s.year_of_study || 1), 0);
        const totalCGPA = students.reduce((sum, s) => sum + parseFloat(s.cgpa || 0), 0);
        this.avg_year = totalYear / this.size;
        this.avg_cgpa = totalCGPA / this.size;
    }
}

export const runHostelAllocationOptimized = async (dbRooms, dbStudents) => {
    const allocations = [];
    const waitlist = [];

    const studentMap = new Map();
    dbStudents.forEach(s => studentMap.set(s.id, s));

    const exactMatchIndex = { Male: {}, Female: {}, Both: {} };
    const partialBuckets = { Male: {}, Female: {}, Both: {} };
    let maxCapacity = 1;

    dbRooms.forEach(dbR => {
        const room = new RoomWrapper(dbR);
        const avail = room.availableBeds();
        if (avail === 0) return; 
        if (room.capacity > maxCapacity) maxCapacity = room.capacity;

        if (!exactMatchIndex[room.current_gender]) exactMatchIndex[room.current_gender] = {};
        if (!exactMatchIndex[room.current_gender][room.hostel_name]) exactMatchIndex[room.current_gender][room.hostel_name] = {};
        if (!exactMatchIndex[room.current_gender][room.hostel_name][room.type]) exactMatchIndex[room.current_gender][room.hostel_name][room.type] = new Set();
        exactMatchIndex[room.current_gender][room.hostel_name][room.type].add(room);
        
        if (!partialBuckets[room.current_gender][avail]) partialBuckets[room.current_gender][avail] = new Set();
        partialBuckets[room.current_gender][avail].add(room);
    });

    const getAvailableSets = (gender, hostel, type) => {
        const sets = [];
        if (exactMatchIndex[gender]?.[hostel]?.[type]) sets.push(exactMatchIndex[gender][hostel][type]);
        if (exactMatchIndex['Both']?.[hostel]?.[type]) sets.push(exactMatchIndex['Both'][hostel][type]);
        return sets;
    };

    const getPartialBuckets = (gender, space) => {
        const buckets = [];
        if (partialBuckets[gender]?.[space]) buckets.push(partialBuckets[gender][space]);
        if (partialBuckets['Both']?.[space]) buckets.push(partialBuckets['Both'][space]);
        return buckets;
    };

    const occupyRoom = (room, count, entityStudents, type) => {
        const oldAvail = room.availableBeds();
        const oldGender = room.current_gender;

        if (partialBuckets[oldGender][oldAvail]) partialBuckets[oldGender][oldAvail].delete(room);
        if (exactMatchIndex[oldGender]?.[room.hostel_name]?.[room.type]) exactMatchIndex[oldGender][room.hostel_name][room.type].delete(room);

        room.occupied += count;
        if (oldGender === 'Both') room.current_gender = entityStudents[0].gender; 
        
        const newAvail = room.availableBeds();
        const newGender = room.current_gender;
        
        if (newAvail > 0) {
            if (!partialBuckets[newGender][newAvail]) partialBuckets[newGender][newAvail] = new Set();
            partialBuckets[newGender][newAvail].add(room);
            if (!exactMatchIndex[newGender]) exactMatchIndex[newGender] = {};
            if (!exactMatchIndex[newGender][room.hostel_name]) exactMatchIndex[newGender][room.hostel_name] = {};
            if (!exactMatchIndex[newGender][room.hostel_name][room.type]) exactMatchIndex[newGender][room.hostel_name][room.type] = new Set();
            exactMatchIndex[newGender][room.hostel_name][room.type].add(room);
        }

        entityStudents.forEach(s => {
            allocations.push({
                student_id: s.id, student_name: s.name, 
                room_id: room.id, room_number: room.room_number, hostel: room.hostel_name,
                room_type: room.type, allocation_type: type, room_gender: room.current_gender
            });
        });
    };

    const processedIds = new Set();
    const entities = [];

    for (const student of dbStudents) {
        if (processedIds.has(student.id)) continue;
        const groupMembers = [student];
        processedIds.add(student.id);

        if (student.roommate_ids) {
            for (const partnerId of student.roommate_ids) {
                const partner = studentMap.get(partnerId);
                if (partner && !processedIds.has(partner.id) && partner.roommate_ids?.includes(student.id) && partner.gender === student.gender) {
                    groupMembers.push(partner);
                    processedIds.add(partner.id);
                }
            }
        }
        entities.push(new AllocationEntity(groupMembers));
    }

    entities.sort((a, b) => {
        if (b.size !== a.size) return b.size - a.size; 
        if (b.avg_year !== a.avg_year) return b.avg_year - a.avg_year;
        return b.avg_cgpa - a.avg_cgpa;
    });

    const unallocatedPhase1 = [];
    for (const entity of entities) {
        let assigned = false;
        for (const pref of entity.preferences) {
            if (entity.size > 1 && pref.type === 'Single') continue;
            const availableSets = getAvailableSets(entity.gender, pref.hostel, pref.type);
            if (availableSets.length === 0) continue;
            let bestRoom = null;
            let minLeftoverSpace = Infinity;

            for (const availableSet of availableSets) {
                for (const room of availableSet) {
                    if (room.hasSpaceFor(entity.size) && room.isEligible(entity.years)) {
                        const leftoverSpace = room.availableBeds() - entity.size;
                        if (leftoverSpace < minLeftoverSpace) {
                            bestRoom = room; minLeftoverSpace = leftoverSpace;
                            if (leftoverSpace === 0) break; 
                        }
                    }
                }
                if (minLeftoverSpace === 0) break;
            }
            if (bestRoom) { occupyRoom(bestRoom, entity.size, entity.students, entity.size > 1 ? 'Mutual Group' : 'Preference Match'); assigned = true; break; }
        }
        if (!assigned) unallocatedPhase1.push(entity);
    }

    const unallocatedPhase2 = [];
    for (const entity of unallocatedPhase1) {
        let assigned = false;
        for (let space = entity.size; space <= maxCapacity; space++) {
            const buckets = getPartialBuckets(entity.gender, space);
            for (const bucket of buckets) {
                for (const room of bucket) {
                    if (room.isEligible(entity.years)) { occupyRoom(room, entity.size, entity.students, 'Group Consolidation'); assigned = true; break; }
                }
                if (assigned) break;
            }
            if (assigned) break;
        }
        if (!assigned) unallocatedPhase2.push(entity);
    }

    for (const entity of unallocatedPhase2) {
        for (const student of entity.students) {
            let assigned = false;
            for (let space = 1; space <= maxCapacity; space++) {
                const buckets = getPartialBuckets(student.gender, space);
                for (const bucket of buckets) {
                    for (const room of bucket) {
                        if (room.isEligible([student.year_of_study])) { occupyRoom(room, 1, [student], 'Fallback (Group Split)'); assigned = true; break; }
                    }
                    if (assigned) break;
                }
                if (assigned) break;
            }
            if (!assigned) waitlist.push({ student_id: student.id, name: student.name, reason: "No eligible beds available." });
        }
    }

    return {
        timestamp: new Date().toISOString(),
        results: { allocations, waitlist, stats: { successfully_allocated: allocations.length, waitlisted: waitlist.length } }
    };
};