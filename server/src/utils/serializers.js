// Central place for turning Prisma models into API-safe JSON shapes.
// Keeping this in one file means "never expose the password hash" only
// has to be true in one place.

function toNumber(decimal) {
  if (decimal === null || decimal === undefined) return decimal;
  return typeof decimal === "object" && typeof decimal.toNumber === "function"
    ? decimal.toNumber()
    : Number(decimal);
}

function safeJsonParse(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function serializeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    businessName: user.businessName || null,
    avatar: user.avatar || null,
    createdAt: user.createdAt,
  };
}

function serializeProduct(product) {
  if (!product) return null;
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    price: toNumber(product.price),
    image: product.image,
    gallery: safeJsonParse(product.gallery, []),
    category: product.category,
    specs: safeJsonParse(product.specs, {}),
    stock: product.stock,
    inStock: product.stock > 0,
    rating: toNumber(product.rating),
    featured: product.featured,
    isNew: product.isNew,
    isActive: product.isActive,
    seller: product.seller
      ? {
          id: product.seller.id,
          name: product.seller.businessName || product.seller.name,
          avatar: product.seller.avatar || null,
        }
      : product.sellerId
      ? { id: product.sellerId, name: null, avatar: null }
      : null,
    createdAt: product.createdAt,
  };
}

function serializeOrder(order) {
  if (!order) return null;
  return {
    id: order.id,
    status: order.status,
    subtotal: toNumber(order.subtotal),
    shipping: toNumber(order.shipping),
    total: toNumber(order.total),
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    shippingAddress: order.shippingAddress,
    city: order.city,
    postalCode: order.postalCode,
    createdAt: order.createdAt,
    items: (order.items || []).map((item) => ({
      id: item.id,
      quantity: item.quantity,
      price: toNumber(item.price),
      lineTotal: toNumber(item.price) * item.quantity,
      product: item.product
        ? {
            id: item.product.id,
            slug: item.product.slug,
            name: item.product.name,
            image: item.product.image,
          }
        : { id: item.productId },
    })),
  };
}

module.exports = { toNumber, safeJsonParse, serializeUser, serializeProduct, serializeOrder };
