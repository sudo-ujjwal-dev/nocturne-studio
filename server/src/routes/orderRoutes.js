const express = require("express");
const orderController = require("../controllers/orderController");
const { requireAuth } = require("../middleware/authMiddleware");
const { validateCreateOrder } = require("../validators/orderValidators");

const router = express.Router();

router.use(requireAuth); // every order route requires a logged-in user

router.post("/", validateCreateOrder, orderController.createOrder);
router.get("/", orderController.getOrders);
router.get("/:id", orderController.getOrderById);

module.exports = router;
