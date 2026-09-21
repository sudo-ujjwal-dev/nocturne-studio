const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const orderService = require("../services/orderService");
const { serializeOrder } = require("../utils/serializers");

const createOrder = asyncHandler(async (req, res) => {
  const {
    items,
    customerName,
    customerEmail,
    customerPhone,
    shippingAddress,
    city,
    postalCode,
  } = req.body;

  const order = await orderService.createOrder({
    userId: req.user.id,
    items,
    customer: { customerName, customerEmail, customerPhone, shippingAddress, city, postalCode },
  });

  res.status(201).json({
    success: true,
    message: "Order placed.",
    data: serializeOrder(order),
  });
});

const getOrders = asyncHandler(async (req, res) => {
  const orders = await orderService.listOrdersForUser(req.user.id);
  res.status(200).json({ success: true, data: orders.map(serializeOrder) });
});

const getOrderById = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) {
    throw new ApiError(400, "Invalid order id.");
  }

  const order = await orderService.getOrderForUser(req.user.id, id);
  res.status(200).json({ success: true, data: serializeOrder(order) });
});

module.exports = { createOrder, getOrders, getOrderById };
