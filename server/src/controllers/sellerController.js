const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const sellerService = require("../services/sellerService");
const { serializeProduct } = require("../utils/serializers");

const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "No image file was uploaded.");
  }
  // Public URL path — express.static serves everything under /public,
  // and this file was saved into public/images/uploads/.
  const url = `/images/uploads/${req.file.filename}`;
  res.status(201).json({ success: true, data: { url } });
});

const createProduct = asyncHandler(async (req, res) => {
  const product = await sellerService.createProduct(req.user.id, req.body);
  res.status(201).json({ success: true, message: "Product created.", data: serializeProduct(product) });
});

const getMyProducts = asyncHandler(async (req, res) => {
  const products = await sellerService.listSellerProducts(req.user.id);
  res.status(200).json({ success: true, data: products.map(serializeProduct) });
});

const updateProduct = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) {
    throw new ApiError(400, "Invalid product id.");
  }
  const product = await sellerService.updateProduct(req.user.id, id, req.body);
  res.status(200).json({ success: true, message: "Product updated.", data: serializeProduct(product) });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) {
    throw new ApiError(400, "Invalid product id.");
  }
  await sellerService.deleteProduct(req.user.id, id);
  res.status(200).json({ success: true, message: "Product deleted." });
});

const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await sellerService.listSellerOrders(req.user.id);
  res.status(200).json({ success: true, data: orders });
});

module.exports = { uploadImage, createProduct, getMyProducts, updateProduct, deleteProduct, getMyOrders };
