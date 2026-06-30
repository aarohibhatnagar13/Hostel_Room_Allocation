/**
 * AsyncHandler Utility
 * 
 * Wraps async Express route handlers and controllers.
 * It automatically catches any unhandled Promise rejections or errors
 * and forwards them to the globalErrorMiddleware via `next()`.
 * 
 * This eliminates the need for repetitive try-catch blocks in every route.
 * 
 * @param {Function} requestHandler - The async route controller function
 * @returns {Function} - Express middleware function
 */
export const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
    };
};