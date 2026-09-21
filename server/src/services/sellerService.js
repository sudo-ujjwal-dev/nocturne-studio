const prisma = require("../utils/prisma");
const ApiError = require("../utils/ApiError");

function slugify(name) {
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Appends -2, -3, ... until the slug is unique. */
async function uniqueSlug(name) {
  const base = slugify(name) || "product";
  let candidate = base;
  let n = 2;
  // Small catalog, so a loop of individual lookups is plenty fast — no
  // need for a cleverer collision-avoidance scheme here.
  while (await prisma.product.findUnique({ where: { slug: candidate } })) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  return candidate;
}

async function createProduct(sellerId, data) {
  const slug = await uniqueSlug(data.name);

  return prisma.product.create({
    data: {
      slug,
      name: data.name,
      description: data.description,
      price: data.price,
      image: data.image,
      gallery: JSON.stringify([data.image]),
      category: data.category,
      specs: JSON.stringify({}),
      stock: data.stock,
      featured: false,
      isNew: true,
      isActive: true,
      sellerId,
    },
  });
}

async function listSellerProducts(sellerId) {
  return prisma.product.findMany({
    where: { sellerId },
    orderBy: { createdAt: "desc" },
  });
}

/** Loads a product and throws unless it belongs to this seller. */
async function getOwnedProduct(sellerId, productId) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw new ApiError(404, "Product not found.");
  }
  if (product.sellerId !== sellerId) {
    throw new ApiError(403, "You can only manage your own products.");
  }
  return product;
}

async function updateProduct(sellerId, productId, patch) {
  await getOwnedProduct(sellerId, productId);

  const data = {};
  if (patch.name !== undefined) data.name = patch.name;
  if (patch.description !== undefined) data.description = patch.description;
  if (patch.price !== undefined) data.price = patch.price;
  if (patch.category !== undefined) data.category = patch.category;
  if (patch.stock !== undefined) data.stock = patch.stock;
  if (patch.isActive !== undefined) data.isActive = patch.isActive;
  if (patch.image !== undefined) {
    data.image = patch.image;
    data.gallery = JSON.stringify([patch.image]);
  }

  return prisma.product.update({ where: { id: productId }, data });
}

async function deleteProduct(sellerId, productId) {
  await getOwnedProduct(sellerId, productId);

  const orderCount = await prisma.orderItem.count({ where: { productId } });
  if (orderCount > 0) {
    // A product with real order history can't be hard-deleted — that
    // would corrupt past orders' line items. Deactivating instead keeps
    // order history intact while pulling it out of the public shop.
    throw new ApiError(
      409,
      "This product has order history and can't be deleted — deactivate it instead so past orders stay intact.",
      { orderCount }
    );
  }

  await prisma.product.delete({ where: { id: productId } });
}

async function listSellerOrders(sellerId) {
  const items = await prisma.orderItem.findMany({
    where: { product: { sellerId } },
    include: {
      product: true,
      order: true,
    },
    orderBy: { order: { createdAt: "desc" } },
  });

  // Group this seller's line items by the order they belong to. A seller
  // only ever sees their own items within an order, never another
  // seller's products that happened to ship in the same cart.
  const byOrder = new Map();
  for (const item of items) {
    if (!byOrder.has(item.orderId)) {
      byOrder.set(item.orderId, {
        orderId: item.order.id,
        status: item.order.status,
        createdAt: item.order.createdAt,
        customerName: item.order.customerName,
        customerEmail: item.order.customerEmail,
        shippingAddress: item.order.shippingAddress,
        city: item.order.city,
        postalCode: item.order.postalCode,
        items: [],
        subtotalForSeller: 0,
      });
    }
    const bucket = byOrder.get(item.orderId);
    const lineTotal = Number(item.price) * item.quantity;
    bucket.items.push({
      productId: item.productId,
      productName: item.product.name,
      productImage: item.product.image,
      quantity: item.quantity,
      price: Number(item.price),
      lineTotal,
    });
    bucket.subtotalForSeller += lineTotal;
  }

  return Array.from(byOrder.values()).sort((a, b) => b.createdAt - a.createdAt);
}

module.exports = { createProduct, listSellerProducts, updateProduct, deleteProduct, listSellerOrders };
