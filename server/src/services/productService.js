const prisma = require("../utils/prisma");
const ApiError = require("../utils/ApiError");

const SORT_MAP = {
  newest: { createdAt: "desc" },
  price_asc: { price: "asc" },
  price_desc: { price: "desc" },
  rating: { rating: "desc" },
  name: { name: "asc" },
};

const SELLER_SELECT = { select: { id: true, name: true, businessName: true, avatar: true } };

async function listProducts(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 12, 1), 48);
  const skip = (page - 1) * limit;

  // Public listings only ever show products their seller has left active.
  const where = { isActive: true };

  if (query.search && String(query.search).trim()) {
    const term = String(query.search).trim();
    where.OR = [
      { name: { contains: term } },
      { description: { contains: term } },
      { category: { contains: term } },
    ];
  }

  if (query.category && query.category !== "all") {
    where.category = query.category;
  }

  if (query.featured === "true") {
    where.featured = true;
  }
  if (query.isNew === "true") {
    where.isNew = true;
  }

  const minPrice = parseFloat(query.minPrice);
  const maxPrice = parseFloat(query.maxPrice);
  if (!Number.isNaN(minPrice) || !Number.isNaN(maxPrice)) {
    where.price = {};
    if (!Number.isNaN(minPrice)) where.price.gte = minPrice;
    if (!Number.isNaN(maxPrice)) where.price.lte = maxPrice;
  }

  const orderBy = SORT_MAP[query.sort] || SORT_MAP.newest;

  const [total, items, categories] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, orderBy, skip, take: limit, include: { seller: SELLER_SELECT } }),
    prisma.product.findMany({
      where: { isActive: true },
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    }),
  ]);

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      categories: categories.map((c) => c.category),
    },
  };
}

async function getProductById(id) {
  const product = await prisma.product.findFirst({
    where: { id, isActive: true },
    include: { seller: SELLER_SELECT },
  });
  if (!product) {
    throw new ApiError(404, "That product could not be found.");
  }
  return product;
}

async function getProductBySlug(slug) {
  const product = await prisma.product.findFirst({
    where: { slug, isActive: true },
    include: { seller: SELLER_SELECT },
  });
  if (!product) {
    throw new ApiError(404, "That product could not be found.");
  }
  return product;
}

async function getRelatedProducts(product, take = 4) {
  return prisma.product.findMany({
    where: {
      category: product.category,
      id: { not: product.id },
      isActive: true,
    },
    take,
    orderBy: { rating: "desc" },
    include: { seller: SELLER_SELECT },
  });
}

module.exports = { listProducts, getProductById, getProductBySlug, getRelatedProducts };
