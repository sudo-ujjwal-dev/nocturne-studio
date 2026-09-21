const ApiError = require("../utils/ApiError");
const { isValidImageRef } = require("../utils/imageRef");

function validateProductInput(req, res, next) {
  const { name, description, price, category, image, stock } = req.body || {};
  const errors = {};

  if (!name || String(name).trim().length < 2) {
    errors.name = "Product name must be at least 2 characters.";
  }
  if (!description || String(description).trim().length < 10) {
    errors.description = "Description should be at least 10 characters.";
  }

  const priceNum = Number(price);
  if (!Number.isFinite(priceNum) || priceNum <= 0) {
    errors.price = "Enter a price greater than 0.";
  }

  if (!category || String(category).trim().length < 2) {
    errors.category = "Category is required.";
  }

  if (!image || !isValidImageRef(image)) {
    errors.image = "Please upload a product image.";
  }

  const stockNum = Number(stock);
  if (!Number.isInteger(stockNum) || stockNum < 0) {
    errors.stock = "Stock must be a whole number of 0 or more.";
  }

  if (Object.keys(errors).length > 0) {
    throw new ApiError(400, "Please fix the highlighted fields.", errors);
  }

  req.body.name = String(name).trim();
  req.body.description = String(description).trim();
  req.body.price = priceNum;
  req.body.category = String(category).trim();
  req.body.image = String(image).trim();
  req.body.stock = stockNum;
  next();
}

// Partial update — only validate whichever fields were actually sent.
function validateProductPatch(req, res, next) {
  const body = req.body || {};
  const errors = {};

  if (body.name !== undefined && String(body.name).trim().length < 2) {
    errors.name = "Product name must be at least 2 characters.";
  }
  if (body.description !== undefined && String(body.description).trim().length < 10) {
    errors.description = "Description should be at least 10 characters.";
  }
  if (body.price !== undefined) {
    const priceNum = Number(body.price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      errors.price = "Enter a price greater than 0.";
    } else {
      body.price = priceNum;
    }
  }
  if (body.category !== undefined && String(body.category).trim().length < 2) {
    errors.category = "Category is required.";
  }
  if (body.image !== undefined && !isValidImageRef(body.image)) {
    errors.image = "Please upload a product image.";
  }
  if (body.stock !== undefined) {
    const stockNum = Number(body.stock);
    if (!Number.isInteger(stockNum) || stockNum < 0) {
      errors.stock = "Stock must be a whole number of 0 or more.";
    } else {
      body.stock = stockNum;
    }
  }
  if (body.isActive !== undefined && typeof body.isActive !== "boolean") {
    errors.isActive = "isActive must be true or false.";
  }

  if (Object.keys(errors).length > 0) {
    throw new ApiError(400, "Please fix the highlighted fields.", errors);
  }

  next();
}

module.exports = { validateProductInput, validateProductPatch };
