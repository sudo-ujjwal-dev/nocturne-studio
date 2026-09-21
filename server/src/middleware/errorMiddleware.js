const ApiError = require("../utils/ApiError");

function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// Must have 4 args for Express to recognize it as an error handler.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Something went wrong on our end.";
  let details = err.details || null;

  // Prisma's "unique constraint failed"
  if (err.code === "P2002") {
    statusCode = 409;
    message = "That value is already in use.";
    details = { fields: err.meta && err.meta.target };
  }

  // Prisma's "record not found" on a related lookup
  if (err.code === "P2025") {
    statusCode = 404;
    message = "The requested record could not be found.";
  }

  // Multer file-upload errors (wrong type, too large, etc.)
  if (err.name === "MulterError") {
    statusCode = 400;
    message =
      err.code === "LIMIT_FILE_SIZE"
        ? "That image is too large — the limit is 5MB."
        : err.message;
  }
  if (!err.statusCode && /only jpeg, png, or webp/i.test(err.message || "")) {
    statusCode = 400;
    message = err.message;
  }

  if (process.env.NODE_ENV !== "production") {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    details,
    // Never leak stack traces to clients outside development.
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
}

module.exports = { notFound, errorHandler };
