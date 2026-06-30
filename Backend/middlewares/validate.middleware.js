// Example using a simple manual validation helper as seen in your previous logic
export const validateRequest = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({ 
            success: false, 
            message: error.details[0].message 
        });
    }
    next();
};

// NEW HOSTEL SCHEMAS
export const studentSubmissionSchema = {
    validate: (data) => {
        const errors = [];
        if (!data.cgpa || data.cgpa < 0 || data.cgpa > 10) errors.push("Valid CGPA required");
        if (!data.yearOfStudy) errors.push("Year of study required");
        if (!data.preferredBlock) errors.push("Preferred block required");
        if (!data.acPreference) errors.push("AC preference required");
        
        return { error: errors.length ? { details: [{ message: errors.join(", ") }] } : null };
    }
};

export const roomUploadSchema = {
    validate: (data) => {
        // Validation for bulk CSV room uploads
        const errors = [];
        if (!Array.isArray(data)) return { error: { details: [{ message: "Must be an array of rooms" }] } };
        
        data.forEach((room, index) => {
            if (!room.roomNumber || !room.hostelBlock || !room.capacity) {
                errors.push(`Room at index ${index} is missing required fields`);
            }
        });
        
        return { error: errors.length ? { details: [{ message: errors.join(", ") }] } : null };
    }
};