import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import db from "../models/index.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "../services/email.service.js";

const isProduction = process.env.NODE_ENV === "production";

const COOKIE_OPTIONS = {
    httpOnly: true, 
    secure: isProduction, // false on localhost, true in production
    sameSite: isProduction ? "none" : "lax", // 'lax' allows localhost cookies to work!
    maxAge: 12 * 60 * 60 * 1000 
};

// ==========================================
// 1. SIGNUP (With Terminal Fallback)
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

        // Save directly to database with is_verified = false (0)
        const newStudent = await db.Student.create({
            name,
            roll_number: normalizedRollNo,
            email: normalizedEmail,
            password: hashedPassword,
            gender,
            cgpa,
            year_of_study: yearOfStudy,
            preferences: preferences || [],
            roommate_ids: roommate_ids || [],
            allocationStatus: 'unallocated',
            is_verified: false 
        });

        // Generate Verification Token valid for 24 hours
        const verificationToken = jwt.sign(
            { email: newStudent.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Attempt to send verification email
        try {
            await sendVerificationEmail(newStudent.email, verificationToken);
            res.status(201).json({ success: true, message: "Account created successfully! A verification email has been sent to your inbox." });
        } catch (emailErr) {
            console.error("❌ SMTP TRANSACTION FAILED (SIGNUP EMAIL BLOCKED):", emailErr.message);
            
            // DEVELOPMENT FALLBACK LINK FOR WI-FI BLOCKS
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3080';
            const fallbackLink = `${frontendUrl}/verify?token=${verificationToken}`;
            
            console.log("\n------------------ DEVELOPMENT FALLBACK ------------------");
            console.log(`✉️ Verification Link for ${newStudent.email}:`);
            console.log(fallbackLink);
            console.log("----------------------------------------------------------\n");

            return res.status(201).json({ 
                success: true, 
                message: "Account created! Since SMTP is blocked on your network, copy the verification link from your Backend Terminal to verify." 
            });
        }
    } catch (e) {
        next(e);
    }
};

export const verifyEmail = async (req, res, next) => {
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({ success: false, message: "Verification token is missing." });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(400).json({ success: false, message: "The verification link is invalid or has expired." });
        }

        const student = await db.Student.findOne({ where: { email: decoded.email } });
        if (!student) {
            return res.status(404).json({ success: false, message: "Associated student account not found." });
        }

        if (student.is_verified) {
            return res.status(200).json({ success: true, message: "Account is already verified." });
        }

        student.is_verified = true;
        await student.save();

        res.status(200).json({ success: true, message: "Email successfully verified! You can now access full portal activities." });
    } catch (e) {
        next(e);
    }
};

// ==========================================
// 3. LOGIN
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
// 4. FORGOT PASSWORD (With Terminal Fallback)
// ==========================================
export const forgotPassword = async (req, res, next) => {
    try {
        const email = (req.body.email || "").trim().toLowerCase();

        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required." });
        }

        const genericSuccessMessage = "Reset link generated successfully.";

        const student = await db.Student.findOne({ where: { email } });
        if (!student) {
            return res.status(200).json({ success: true, message: genericSuccessMessage });
        }

        const resetToken = jwt.sign(
            { email: student.email, rollNo: student.roll_number },
            process.env.JWT_SECRET,
            { expiresIn: "15m" }
        );

        try {
            await sendPasswordResetEmail(student.email, resetToken);
            return res.status(200).json({ success: true, message: "Reset link sent to your email." });
        } catch (emailErr) {
            console.error("❌ SMTP TRANSACTION FAILED (RESET EMAIL BLOCKED):", emailErr.message);

            // DEVELOPMENT FALLBACK LINK FOR WI-FI BLOCKS
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3080';
            const fallbackLink = `${frontendUrl}/reset-password?token=${resetToken}`;

            console.log("\n------------------ DEVELOPMENT FALLBACK ------------------");
            console.log(`🔑 Password Reset Link for ${student.email}:`);
            console.log(fallbackLink);
            console.log("----------------------------------------------------------\n");

            // Returns status 200 with fallback instructions
            return res.status(200).json({ 
                success: true, 
                message: "Reset link generated! Since SMTP is blocked on your network, check your Backend Terminal to copy the reset link." 
            });
        }
    } catch (e) {
        next(e);
    }
};

// ==========================================
// 5. RESET PASSWORD
// ==========================================
export const resetPassword = async (req, res, next) => {
    try {
        const { token, newPassword, password } = req.body;
        const targetPassword = newPassword || password;

        if (!token) {
            return res.status(400).json({ success: false, message: "Missing or invalid token." });
        }

        if (!targetPassword) {
            return res.status(400).json({ success: false, message: "New password is required." });
        }

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

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            if (err.name === "TokenExpiredError") {
                return res.status(400).json({ success: false, message: "The reset link has expired. Please request a new one." });
            }
            return res.status(400).json({ success: false, message: "Invalid or corrupted reset token." });
        }

        const student = await db.Student.findOne({ where: { email: decoded.email } });
        if (!student) {
            return res.status(404).json({ success: false, message: "Student account not found." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(targetPassword, salt);

        student.password = hashedPassword;
        await student.save();

        return res.status(200).json({ success: true, message: "Password successfully updated." });
    } catch (e) {
        next(e);
    }
};