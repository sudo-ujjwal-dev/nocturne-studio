const ApiError = require("../utils/ApiError");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegister(req, res, next) {
  const { name, email, password, confirmPassword, businessName } = req.body || {};
  let { role } = req.body || {};
  const errors = {};

  // Whitelist role rather than trusting whatever string the client sends —
  // anything other than exactly "SELLER" is treated as a normal customer.
  role = role === "SELLER" ? "SELLER" : "CUSTOMER";

  if (!name || String(name).trim().length < 2) {
    errors.name = "Name must be at least 2 characters.";
  }
  if (!email || !EMAIL_RE.test(String(email).trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (!password || String(password).length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }
  if (confirmPassword !== undefined && confirmPassword !== password) {
    errors.confirmPassword = "Passwords do not match.";
  }
  if (role === "SELLER" && (!businessName || String(businessName).trim().length < 2)) {
    errors.businessName = "Business name is required for a seller account.";
  }

  if (Object.keys(errors).length > 0) {
    throw new ApiError(400, "Please fix the highlighted fields.", errors);
  }

  req.body.name = String(name).trim();
  req.body.email = String(email).trim().toLowerCase();
  req.body.role = role;
  req.body.businessName = role === "SELLER" ? String(businessName).trim() : undefined;
  next();
}

function validateLogin(req, res, next) {
  const { email, password } = req.body || {};
  const errors = {};

  if (!email || !EMAIL_RE.test(String(email).trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (!password) {
    errors.password = "Password is required.";
  }

  if (Object.keys(errors).length > 0) {
    throw new ApiError(400, "Please fix the highlighted fields.", errors);
  }

  req.body.email = String(email).trim().toLowerCase();
  next();
}

module.exports = { validateRegister, validateLogin };
