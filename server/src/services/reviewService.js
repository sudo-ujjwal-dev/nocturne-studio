const prisma = require("../utils/prisma");
const ApiError = require("../utils/ApiError");

/** Recomputes and saves a product's average rating from its reviews. */
async function syncProductRating(tx, productId) {
  const agg = await tx.review.aggregate({
    where: { productId },
    _avg: { rating: true },
  });
  const avg = agg._avg.rating ?? 0;
  await tx.product.update({
    where: { id: productId },
    data: { rating: Math.round(avg * 10) / 10 },
  });
}

/**
 * Creates or updates the caller's review for a product (one per person,
 * per the schema's unique constraint), then recomputes that product's
 * stored rating from every review it has — both steps in one transaction
 * so the rating shown never drifts from the reviews behind it.
 */
async function upsertReview(userId, productId, { rating, comment }) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw new ApiError(404, "That product could not be found.");
  }

  const review = await prisma.$transaction(async (tx) => {
    const saved = await tx.review.upsert({
      where: { productId_userId: { productId, userId } },
      update: { rating, comment },
      create: { productId, userId, rating, comment },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });
    await syncProductRating(tx, productId);
    return saved;
  });

  const purchase = await prisma.order.findFirst({
    where: { userId, items: { some: { productId } } },
    select: { id: true },
  });

  return { ...review, verifiedPurchase: Boolean(purchase) };
}

async function listReviewsForProduct(productId) {
  const reviews = await prisma.review.findMany({
    where: { productId },
    include: { user: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Verified-buyer badge: anyone who has an order containing this
  // product. One query for the whole list rather than one per review.
  const buyerOrders = await prisma.order.findMany({
    where: { items: { some: { productId } } },
    select: { userId: true },
    distinct: ["userId"],
  });
  const verifiedBuyerIds = new Set(buyerOrders.map((o) => o.userId));

  return reviews.map((r) => ({ ...r, verifiedPurchase: verifiedBuyerIds.has(r.userId) }));
}

module.exports = { upsertReview, listReviewsForProduct };
