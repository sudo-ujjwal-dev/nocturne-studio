const express = require("express");
const sellerController = require("../controllers/sellerController");
const { requireAuth, requireSeller } = require("../middleware/authMiddleware");
const { validateProductInput, validateProductPatch } = require("../validators/sellerValidators");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

// Every route here requires a logged-in SELLER account — a CUSTOMER
// account gets a 403 even hitting these URLs directly.
router.use(requireAuth, requireSeller);

router.post("/upload", upload.single("image"), sellerController.uploadImage);

router.get("/products", sellerController.getMyProducts);
router.post("/products", validateProductInput, sellerController.createProduct);
router.patch("/products/:id", validateProductPatch, sellerController.updateProduct);
router.delete("/products/:id", sellerController.deleteProduct);

router.get("/orders", sellerController.getMyOrders);

module.exports = router;
