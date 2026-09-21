const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const productService = require("../services/productService");
const { serializeProduct } = require("../utils/serializers");

const getProducts = asyncHandler(async (req, res) => {
  const { items, meta } = await productService.listProducts(req.query);
  res.status(200).json({
    success: true,
    data: items.map(serializeProduct),
    meta,
  });
});

const getProductById = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) {
    throw new ApiError(400, "Invalid product id.");
  }

  const product = await productService.getProductById(id);
  const related = await productService.getRelatedProducts(product);

  res.status(200).json({
    success: true,
    data: {
      ...serializeProduct(product),
      related: related.map(serializeProduct),
    },
  });
});

const getProductBySlug = asyncHandler(async (req, res) => {
  const product = await productService.getProductBySlug(req.params.slug);
  const related = await productService.getRelatedProducts(product);

  res.status(200).json({
    success: true,
    data: {
      ...serializeProduct(product),
      related: related.map(serializeProduct),
    },
  });
});

module.exports = { getProducts, getProductById, getProductBySlug };
