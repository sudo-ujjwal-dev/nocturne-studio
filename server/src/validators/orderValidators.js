const ApiError = require("../utils/ApiError");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateCreateOrder(req, res, next) {
  const {
    items,
    customerName,
    customerEmail,
    customerPhone,
    shippingAddress,
    city,
    postalCode,
  } = req.body || {};

  const errors = {};

  if (!Array.isArray(items) || items.length === 0) {
    errors.items = "Your cart is empty.";
  } else {
    for (const item of items) {
      if (!item || !Number.isInteger(item.productId) || item.productId <= 0) {
        errors.items = "One or more cart items are invalid.";
        break;
      }
      if (!Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > 20) {
        errors.items = "Quantities must be whole numbers between 1 and 20.";
        break;
      }
    }
  }

  if (!customerName || String(customerName).trim().length < 2) {
    errors.customerName = "Full name is required.";
  }
  if (!customerEmail || !EMAIL_RE.test(String(customerEmail).trim())) {
    errors.customerEmail = "Enter a valid email address.";
  }
  if (!customerPhone || String(customerPhone).trim().length < 6) {
    errors.customerPhone = "Enter a valid phone number.";
  }
  if (!shippingAddress || String(shippingAddress).trim().length < 4) {
    errors.shippingAddress = "Shipping address is required.";
  }
  if (!city || String(city).trim().length < 2) {
    errors.city = "City is required.";
  }
  if (!postalCode || String(postalCode).trim().length < 3) {
    errors.postalCode = "Postal code is required.";
  }

  if (Object.keys(errors).length > 0) {
    throw new ApiError(400, "Please fix the highlighted fields.", errors);
  }

  next();
}

module.exports = { validateCreateOrder };
