const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const reviewService = require("../services/reviewService");

function serializeReview(r) {
  return {
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt,
    verifiedPurchase: r.verifiedPurchase,
    author: {
      id: r.user.id,
      name: r.user.name,
      avatar: r.user.avatar || null,
    },
  };
}

const getProductReviews = asyncHandler(async (req, res) => {
  const productId = parseInt(req.params.id, 10);
  if (!Number.isInteger(productId)) {
    throw new ApiError(400, "Invalid product id.");
  }
  const reviews = await reviewService.listReviewsForProduct(productId);
  res.status(200).json({ success: true, data: reviews.map(serializeReview) });
});

const submitReview = asyncHandler(async (req, res) => {
  const productId = parseInt(req.params.id, 10);
  if (!Number.isInteger(productId)) {
    throw new ApiError(400, "Invalid product id.");
  }
  const review = await reviewService.upsertReview(req.user.id, productId, req.body);
  res.status(201).json({
    success: true,
    message: "Review saved.",
    data: serializeReview(review),
  });
});

module.exports = { getProductReviews, submitReview };
