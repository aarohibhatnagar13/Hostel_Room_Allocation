// ==========================================
// GLOBAL ERROR HANDLER MIDDLEWARE
// ==========================================

/**
 * Catches all errors thrown in the application, logs them securely, 
 * and returns a standardized JSON response to the frontend.
 */
export const globalErrorHandler = (err, req, res, next) => {
    // Determine the status code (default to 500 Internal Server Error)
    let statusCode = err.statusCode || 500;
    let message = err.message || "An unexpected Internal Server Error occurred.";

    // Handle specific Sequelize/Database errors gracefully
    if (err.name === 'SequelizeUniqueConstraintError') {
        statusCode = 409; // Conflict
        message = "A record with this data already exists (Duplicate Entry).";
    }
    
    if (err.name === 'SequelizeValidationError') {
        statusCode = 400; // Bad Request
        message = err.errors.map(e => e.message).join(", ");
    }

    if (err.name === 'JsonWebTokenError') {
        statusCode = 401; // Unauthorized
        message = "Invalid authentication token. Please log in again.";
    }

    if (err.name === 'TokenExpiredError') {
        statusCode = 401; // Unauthorized
        message = "Your session has expired. Please log in again.";
    }

    // Secure Logging: Log the full error to the server console for debugging
    console.error(`[ERROR] ${statusCode} | ${req.method} ${req.originalUrl} | IP: ${req.ip}`);
    if (process.env.NODE_ENV !== "production") {
        console.error(err.stack);
    }

    // Standardized API Response
    res.status(statusCode).json({
        success: false,
        message: message,
        // Only leak the stack trace to the frontend if we are in development mode
        ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
    });
};