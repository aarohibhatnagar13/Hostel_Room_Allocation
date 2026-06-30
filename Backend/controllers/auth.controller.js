import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import db from "../models/index.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "../services/email.service.js";

const COOKIE_OPTIONS = {
    httpOnly: true, 
    secure: true,       
    sameSite: "none",   
    maxAge: 12 * 60 * 60 * 1000 
};

export const signup = async (req, res, next) => {
    try {
        // Extended destructuring to include hostel preferences and academic details
        const { 
            name, rollNo, email, password, 
            cgpa, yearOfStudy, 
            preferredBlock, preferredFloor, acPreference 
        } = req.body;

        const normalizedEmail = email.toLowerCase().trim();
        const normalizedRollNo = rollNo.toUpperCase().trim();

        // 1. Check if student already exists
        const existingStudent = await db.Student.findOne({ 
            where: { [db.Sequelize.Op.or]: [{ email: normalizedEmail }, { rollNo: normalizedRollNo }] } 
        });

        if (existingStudent) {
            return res.status(409).json({ success: false, message: "A student with this Email or Roll Number already exists." });
        }

        // 2. Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Temporary JWT for verification (Pack all new fields into the token)
        const verificationToken = jwt.sign(
            { 
                name, rollNo: normalizedRollNo, email: normalizedEmail, password: hashedPassword,
                cgpa, yearOfStudy, preferredBlock, preferredFloor, acPreference
            }, 
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        // 4. Send Email
        await sendVerificationEmail(normalizedEmail, verificationToken);

        res.status(201).json({ success: true, message: "Registration initiated! Please check your email." });
    } catch (e) {
        next(e);
    }
};

export const verifyEmail = async (req, res, next) => {
    try {
        const { token } = req.params;

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(400).json({ success: false, message: "Link expired or invalid." });
        }

        // Unpack all hostel-specific fields
        const { 
            name, rollNo, email, password, 
            cgpa, yearOfStudy, 
            preferredBlock, preferredFloor, acPreference 
        } = decoded;

        const existingStudent = await db.Student.findOne({ where: { email } });
        if (existingStudent) {
            return res.status(400).json({ success: false, message: "Email already verified!" });
        }

        // 3. Create Student with NEW Hostel Fields
        await db.Student.create({
            name,
            rollNo,
            email,
            password,
            cgpa,
            year_of_study: yearOfStudy,
            preferred_block: preferredBlock,
            preferred_floor: preferredFloor,
            ac_preference: acPreference
        });

        res.json({ success: true, message: "Account verified securely! You can now log in." });
    } catch (e) {
        next(e);
    }
};

export const login = async (req, res, next) => {
    try {
        const email = (req.body.email || "").trim().toLowerCase();
        const password = (req.body.password || "").trim();

        const envAdminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
        const envAdminPassword = (process.env.ADMIN_PASSWORD || "").trim();

        let role = "STUDENT";
        let rollNo = null;

        // 1. ADMIN CHECK
        if (email === envAdminEmail) {
            if (password !== envAdminPassword) {
                return res.status(401).json({ success: false, message: "Invalid Admin Credentials" });
            }
            role = "ADMIN";
            rollNo = "ADMIN";
        } else {
            // 2. WARDEN CHECK (Renamed from Lab Manager)
            const authUser = await db.AuthorizedUser.findOne({ where: { email } });
            if (authUser) {
                const isMatch = await bcrypt.compare(password, authUser.password);
                if (!isMatch) return res.status(401).json({ success: false, message: "Invalid Credentials" });
                
                role = "HOSTEL_WARDEN"; // Updated Role Name
                rollNo = "WARDEN";
            } else {
                // 3. STUDENT CHECK
                if (!email.endsWith("@lnmiit.ac.in")) {
                    return res.status(403).json({ success: false, message: "Please use your official email." });
                }

                const student = await db.Student.findOne({ where: { email } });
                if (!student) {
                    return res.status(401).json({ success: false, message: "Account not found." });
                }

                const isMatch = await bcrypt.compare(password, student.password);
                if (!isMatch) return res.status(401).json({ success: false, message: "Invalid Credentials" });

                rollNo = student.rollNo;
            }
        }

        const token = jwt.sign({ role, email, rollNo }, process.env.JWT_SECRET, { expiresIn: '12h' });

        res.cookie("accessToken", token, COOKIE_OPTIONS);
        return res.json({ success: true, role, rollNo, message: "Login successful" });

    } catch (e) {
        next(e);
    }
};

// ... Logout, ForgotPassword, ResetPassword remain functionally the same, 
// just ensure they use the correct roles when verifying tokens ...