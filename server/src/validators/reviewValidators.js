const ApiError = require("../utils/ApiError");

function validateReviewInput(req, res, next) {
  const { rating, comment } = req.body || {};
  const errors = {};

  const ratingNum = Number(rating);
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    errors.rating = "Choose a rating from 1 to 5 stars.";
  }

  if (comment !== undefined && comment !== null && String(comment).trim().length > 1000) {
    errors.comment = "Keep the review under 1000 characters.";
  }

  if (Object.keys(errors).length > 0) {
    throw new ApiError(400, "Please fix the highlighted fields.", errors);
  }

  req.body.rating = ratingNum;
  req.body.comment = comment ? String(comment).trim() : null;
  next();
}

module.exports = { validateReviewInput };
