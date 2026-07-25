import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import db from "../models/index.js";
import { sendPasswordResetEmail } from "../services/email.service.js";

const isProduction = process.env.NODE_ENV === "production";

const COOKIE_OPTIONS = {
    httpOnly: true, 
    secure: isProduction, // false on localhost, true in production
    sameSite: isProduction ? "none" : "lax", // 'lax' allows localhost cookies to work!
    maxAge: 12 * 60 * 60 * 1000 
};

// ==========================================
// 1. SIGNUP (Email Bypassed for Testing)
// ==========================================
export const signup = async (req, res, next) => {
    try {
        const { 
            name, rollNo, email, password, 
            gender, cgpa, yearOfStudy, 
            preferences, roommate_ids 
        } = req.body;

        const normalizedEmail = email.toLowerCase().trim();
        const normalizedRollNo = rollNo.toUpperCase().trim();

        const existingStudent = await db.Student.findOne({ 
            where: { [db.Sequelize.Op.or]: [{ email: normalizedEmail }, { roll_number: normalizedRollNo }] } 
        });

        if (existingStudent) {
            return res.status(409).json({ success: false, message: "An account with this Email or Roll Number already exists." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Save directly to database
        await db.Student.create({
            name,
            roll_number: normalizedRollNo,
            email: normalizedEmail,
            password: hashedPassword,
            gender,
            cgpa,
            year_of_study: yearOfStudy,
            preferences: preferences || [],
            roommate_ids: roommate_ids || [],
            allocationStatus: 'unallocated'
        });

        res.status(201).json({ success: true, message: "Account created successfully! You can now log in." });
    } catch (e) {
        next(e);
    }
};

export const verifyEmail = async (req, res, next) => { res.json({ success: true }); };

// ==========================================
// 3. LOGIN (Domain Check Removed)
// ==========================================
export const login = async (req, res, next) => {
    try {
        const email = (req.body.email || "").trim().toLowerCase();
        const password = (req.body.password || "").trim();

        const envAdminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
        const envAdminPassword = (process.env.ADMIN_PASSWORD || "").trim();

        let role = "STUDENT";
        let rollNo = null;

        if (email === envAdminEmail) {
            if (password !== envAdminPassword) return res.status(401).json({ success: false, message: "Invalid Admin Credentials" });
            role = "ADMIN";
            rollNo = "ADMIN";
        } else {
            const authUser = await db.AuthorizedUser.findOne({ where: { email } });
            if (authUser) {
                const isMatch = await bcrypt.compare(password, authUser.password);
                if (!isMatch) return res.status(401).json({ success: false, message: "Invalid Credentials" });
                role = "HOSTEL_WARDEN";
                rollNo = "WARDEN";
            } else {
                
                // STUDENT CHECK
                const student = await db.Student.findOne({ where: { email } });
                
                // If account doesn't exist, stop here and tell the frontend!
                if (!student) {
                    return res.status(401).json({ success: false, message: "Account not found. Please create an account first." });
                }

                const isMatch = await bcrypt.compare(password, student.password);
                if (!isMatch) return res.status(401).json({ success: false, message: "Invalid Password." });

                rollNo = student.roll_number;
            }
        }

        const token = jwt.sign({ role, email, rollNo }, process.env.JWT_SECRET, { expiresIn: '12h' });
        res.cookie("accessToken", token, COOKIE_OPTIONS);
        
        return res.json({ success: true, role, rollNo, message: "Login successful" });
    } catch (e) {
        next(e);
    }
};

export const logout = async (req, res, next) => {
    res.clearCookie("accessToken", COOKIE_OPTIONS);
    return res.json({ success: true, message: "Logged out successfully" });
};

// ==========================================
// 4. FORGOT PASSWORD
// ==========================================
export const forgotPassword = async (req, res, next) => {
    try {
        const email = (req.body.email || "").trim().toLowerCase();

        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required." });
        }

        // To protect user privacy, return a standard success message whether the user exists or not.
        const genericSuccessMessage = "Reset link sent to your email if the account exists.";

        const student = await db.Student.findOne({ where: { email } });
        if (!student) {
            return res.status(200).json({ success: true, message: genericSuccessMessage });
        }

        // Generate temporary single-use reset token valid for 15 minutes
        const resetToken = jwt.sign(
            { email: student.email, rollNo: student.roll_number },
            process.env.JWT_SECRET,
            { expiresIn: "15m" }
        );

        // Send reset email via preconfigured service
        await sendPasswordResetEmail(student.email, resetToken);

        return res.status(200).json({ success: true, message: genericSuccessMessage });
    } catch (e) {
        next(e);
    }
};

// ==========================================
// 5. RESET PASSWORD
// ==========================================
export const resetPassword = async (req, res, next) => {
    try {
        // Accepts both "newPassword" (from frontend api.ts) and standard "password" keys
        const { token, newPassword, password } = req.body;
        const targetPassword = newPassword || password;

        if (!token) {
            return res.status(400).json({ success: false, message: "Missing or invalid token." });
        }

        if (!targetPassword) {
            return res.status(400).json({ success: false, message: "New password is required." });
        }

        // Validate password rules on backend to keep schema parity with frontend checks
        if (targetPassword.length < 8) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });
        }
        if (!/[0-9]/.test(targetPassword)) {
            return res.status(400).json({ success: false, message: "Password must contain at least 1 numeric character." });
        }
        if (!/[a-z]/.test(targetPassword)) {
            return res.status(400).json({ success: false, message: "Password must contain at least 1 lowercase letter." });
        }
        if (!/[A-Z]/.test(targetPassword)) {
            return res.status(400).json({ success: false, message: "Password must contain at least 1 uppercase letter." });
        }
        if (!/[^a-zA-Z0-9]/.test(targetPassword)) {
            return res.status(400).json({ success: false, message: "Password must contain at least 1 symbol." });
        }

        // Decode and verify reset token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            if (err.name === "TokenExpiredError") {
                return res.status(400).json({ success: false, message: "The reset link has expired. Please request a new one." });
            }
            return res.status(400).json({ success: false, message: "Invalid or corrupted reset token." });
        }

        // Locate student from decoded email
        const student = await db.Student.findOne({ where: { email: decoded.email } });
        if (!student) {
            return res.status(404).json({ success: false, message: "Student account not found." });
        }

        // Securely hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(targetPassword, salt);

        // Persist update in Database
        student.password = hashedPassword;
        await student.save();

        return res.status(200).json({ success: true, message: "Password successfully updated." });
    } catch (e) {
        next(e);
    }
};