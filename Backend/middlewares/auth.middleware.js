import jwt from "jsonwebtoken";
import db from "../models/index.js";

export const requireAuth = async (req, res, next) => {
    const token = req.cookies.accessToken;
    if (!token) return res.status(401).json({ message: "Unauthorized: No token provided" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Contains role, email, rollNo
        next();
    } catch (err) {
        return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }
};

export const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'ADMIN') next();
    else res.status(403).json({ message: "Forbidden: Admin access required" });
};

// RENAMED from requireManagerOrAdmin
export const requireWardenOrAdmin = (req, res, next) => {
    const role = req.user?.role;
    if (role === 'ADMIN' || role === 'HOSTEL_WARDEN') next();
    else res.status(403).json({ message: "Forbidden: Warden or Admin access required" });
};