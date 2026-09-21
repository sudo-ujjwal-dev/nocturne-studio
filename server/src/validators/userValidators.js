const ApiError = require("../utils/ApiError");
const { isValidImageRef } = require("../utils/imageRef");

// Partial update — only validate whichever fields were actually sent.
function validateProfileUpdate(req, res, next) {
  const body = req.body || {};
  const errors = {};

  if (body.name !== undefined && String(body.name).trim().length < 2) {
    errors.name = "Name must be at least 2 characters.";
  }
  if (body.avatar !== undefined && body.avatar !== null && body.avatar !== "" && !isValidImageRef(body.avatar)) {
    errors.avatar = "That doesn't look like a valid image.";
  }

  if (Object.keys(errors).length > 0) {
    throw new ApiError(400, "Please fix the highlighted fields.", errors);
  }

  if (body.name !== undefined) req.body.name = String(body.name).trim();
  next();
}

module.exports = { validateProfileUpdate };
