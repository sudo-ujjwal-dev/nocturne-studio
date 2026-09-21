const prisma = require("../utils/prisma");
const ApiError = require("../utils/ApiError");

const FLAT_SHIPPING_RATE = parseFloat(process.env.FLAT_SHIPPING_RATE || "12.00");
const FREE_SHIPPING_THRESHOLD = parseFloat(process.env.FREE_SHIPPING_THRESHOLD || "150.00");

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Creates an order from a cart the client sent, but never trusts any
 * price or total from the client — every dollar figure here is read
 * fresh from the database inside a single transaction, and stock is
 * checked and decremented in the same transaction so two simultaneous
 * checkouts can never both succeed on the last unit.
 */
async function createOrder({ userId, items, customer }) {
  const productIds = items.map((i) => i.productId);

  const order = await prisma.$transaction(async (tx) => {
    const products = await tx.product.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Verify every requested product still exists and is still for sale
    // before touching stock — a seller may have deactivated it after it
    // was added to someone's cart.
    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new ApiError(404, `Product #${item.productId} no longer exists.`);
      }
      if (!product.isActive) {
        throw new ApiError(
          409,
          `"${product.name}" is no longer available — please remove it from your cart.`,
          { productId: product.id }
        );
      }
    }

    // Decrement stock with the availability check built into the WHERE
    // clause, so the check and the write are one atomic row-level
    // operation. If two checkouts race for the last unit, only one
    // UPDATE can match `stock >= quantity` — the loser sees count === 0
    // and the whole transaction rolls back instead of overselling.
    for (const item of items) {
      const product = productMap.get(item.productId);
      const result = await tx.product.updateMany({
        where: { id: item.productId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (result.count === 0) {
        throw new ApiError(
          409,
          `Only ${product.stock} left of "${product.name}" — please adjust the quantity.`,
          { productId: product.id, available: product.stock }
        );
      }
    }

    // Server-side pricing, using the prices read at the top of this
    // transaction. The client's totals are never used.
    let subtotal = 0;
    const lineItems = items.map((item) => {
      const product = productMap.get(item.productId);
      const unitPrice = Number(product.price);
      subtotal += unitPrice * item.quantity;
      return {
        productId: product.id,
        quantity: item.quantity,
        price: unitPrice,
      };
    });
    subtotal = round2(subtotal);

    const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_RATE;
    const total = round2(subtotal + shipping);

    const created = await tx.order.create({
      data: {
        userId,
        subtotal,
        shipping,
        total,
        customerName: customer.customerName,
        customerEmail: customer.customerEmail,
        customerPhone: customer.customerPhone,
        shippingAddress: customer.shippingAddress,
        city: customer.city,
        postalCode: customer.postalCode,
        items: { create: lineItems },
      },
      include: { items: { include: { product: true } } },
    });

    return created;
  });

  return order;
}

async function listOrdersForUser(userId) {
  return prisma.order.findMany({
    where: { userId },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });
}

async function getOrderForUser(userId, orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } } },
  });

  if (!order) {
    throw new ApiError(404, "Order not found.");
  }

  // Users may only ever see their own orders.
  if (order.userId !== userId) {
    throw new ApiError(403, "You don't have access to this order.");
  }

  return order;
}

module.exports = { createOrder, listOrdersForUser, getOrderForUser, FLAT_SHIPPING_RATE, FREE_SHIPPING_THRESHOLD };
