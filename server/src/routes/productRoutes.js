const express = require("express");
const productController = require("../controllers/productController");
const reviewController = require("../controllers/reviewController");
const { requireAuth } = require("../middleware/authMiddleware");
const { validateReviewInput } = require("../validators/reviewValidators");

const router = express.Router();

router.get("/", productController.getProducts);
router.get("/slug/:slug", productController.getProductBySlug);
router.get("/:id", productController.getProductById);

router.get("/:id/reviews", reviewController.getProductReviews);
router.post("/:id/reviews", requireAuth, validateReviewInput, reviewController.submitReview);

module.exports = router;
