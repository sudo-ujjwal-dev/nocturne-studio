const { verifyToken } = require("../utils/jwt");
const ApiError = require("../utils/ApiError");
const prisma = require("../utils/prisma");

function extractToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    return header.slice(7);
  }
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  return null;
}

/**
 * Requires a valid JWT. Loads the current user (minus password) onto
 * req.user. Any route behind this can trust req.user.id is the real,
 * authenticated user — never take a userId from the request body.
 */
const requireAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      throw new ApiError(401, "You must be logged in to do that.");
    }

    const payload = verifyToken(token);

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new ApiError(401, "Your session is no longer valid.");
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return next(new ApiError(401, "Your session has expired. Please log in again."));
    }
    next(err);
  }
};

/**
 * Requires the authenticated user to be a SELLER account. Must run after
 * requireAuth (needs req.user already loaded). A CUSTOMER account gets a
 * 403 even if they guess a seller endpoint's URL directly — the role
 * check happens on every request, not just in the UI.
 */
const requireSeller = (req, res, next) => {
  if (!req.user) {
    return next(new ApiError(401, "You must be logged in to do that."));
  }
  if (req.user.role !== "SELLER") {
    return next(new ApiError(403, "This action is only available to seller accounts."));
  }
  next();
};

module.exports = { requireAuth, requireSeller };
