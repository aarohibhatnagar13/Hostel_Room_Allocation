import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import db from "./models/index.js";

// Middlewares
import {
    requireAuth,
    requireAdmin,
    requireWardenOrAdmin
} from "./middlewares/auth.middleware.js";

import { asyncHandler } from "./utils/AsyncHandler.js";

// Allocation Controller
import {
    triggerAllocation,
    getAllocationHistory,
    confirmRoomBooking
} from "./controllers/allocation.controller.js";

// Auth Controller
import {
    signup,
    login,
    verifyEmail,
    logout,
    forgotPassword,
    resetPassword
} from "./controllers/auth.controller.js";

dotenv.config();

const app = express();
const PORT = 5001;

/* --------------------------- MIDDLEWARE --------------------------- */

app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173", // Make sure this matches your React port exactly!
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request Logger
app.use((req, res, next) => {
    console.log(`${req.method} ${req.originalUrl}`);
    next();
});

/* ---------------------------- AUTH ---------------------------- */

app.post("/api/auth/signup", signup);
app.post("/api/auth/login", login);
app.post("/api/auth/verify/:token", verifyEmail);
app.post("/api/auth/logout", logout);
app.post("/api/auth/forgot-password", forgotPassword);
app.post("/api/auth/reset-password", resetPassword);

/* -------------------------- STUDENT -------------------------- */

// FIXED: Changed from /profile/ to /check/ to match frontend StudentPortal.tsx
app.get(
    "/api/student/check/:rollNo",
    requireAuth,
    asyncHandler(async (req, res) => {
        const student = await db.Student.findOne({
            where: {
                rollNo: req.params.rollNo.toUpperCase()
            },
            include: [
                {
                    model: db.Room,
                    as: "allocatedRoom"
                }
            ]
        });

        if (!student) {
            // Frontend expects { exists: false } to redirect/handle errors gracefully
            return res.json({ exists: false, message: "Student not found" });
        }

        res.json({
            success: true,
            exists: true,
            hasSubmitted: true, // Since preferences are now part of signup
            studentData: student
        });
    })
);

/* ------------------------- ALLOCATION ------------------------- */

app.post(
    "/api/allocation/run",
    requireAuth,
    requireAdmin,
    triggerAllocation
);

app.get(
    "/api/allocation/history",
    requireAuth,
    requireAdmin,
    getAllocationHistory
);

app.post(
    "/api/allocation/confirm",
    requireAuth,
    confirmRoomBooking
);

/* ---------------------------- ROOMS ---------------------------- */

app.get(
    "/api/rooms",
    requireAuth,
    asyncHandler(async (req, res) => {
        const rooms = await db.Room.findAll({
            // FIXED: Updated to use hostel_name instead of old hostelBlock
            order: [
                ["hostel_name", "ASC"],
                ["room_number", "ASC"]
            ]
        });

        res.json({
            success: true,
            data: rooms
        });
    })
);

app.post(
    "/api/warden/mark-occupancy",
    requireAuth,
    requireWardenOrAdmin,
    asyncHandler(async (req, res) => {
        const { roomId, occupiedBeds } = req.body;
        const room = await db.Room.findByPk(roomId);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Room not found"
            });
        }

        room.occupied_beds = occupiedBeds; // Ensure exact DB column mapping matches
        await room.save();

        res.json({
            success: true,
            message: "Occupancy updated"
        });
    })
);

/* ---------------------- BULK ROOM IMPORT ---------------------- */

app.post(
    "/api/admin/rooms/bulk",
    requireAuth,
    requireAdmin,
    asyncHandler(async (req, res) => {
        if (!Array.isArray(req.body)) {
            return res.status(400).json({
                success: false,
                message: "Expected an array"
            });
        }

        // FIXED: Maps frontend payload to the NEW Database schema
        const rooms = req.body.map(room => ({
            room_number: room.roomNumber,
            hostel_name: room.hostelName || room.hostelBlock, // Fallback if admin uses old CSV
            capacity: Number(room.capacity) || 2,
            floor: Number(room.floor),
            room_type: room.roomType || "Single",
            gender: room.gender || "Both", // NEW Field
            version: 0
        }));

        await db.Room.bulkCreate(rooms, {
            updateOnDuplicate: [
                "capacity",
                "floor",
                "room_type",
                "gender"
            ]
        });

        res.json({
            success: true,
            message: `Imported ${rooms.length} rooms successfully.`
        });
    })
);

/* ---------------------------- 404 ---------------------------- */

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found"
    });
});

/* ---------------------- GLOBAL ERROR ---------------------- */

app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error"
    });
});

/* ---------------------------- START ---------------------------- */

const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`✅ Frontend Allowed: ${process.env.FRONTEND_URL || "http://localhost:3080"}`);
});

// This will catch the silent crash and tell us exactly what is wrong!
server.on('error', (err) => {
    console.error("❌ CRITICAL SERVER ERROR:", err.message);
});