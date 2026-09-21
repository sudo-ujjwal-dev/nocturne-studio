const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const prisma = require("../utils/prisma");
const { serializeUser } = require("../utils/serializers");

const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: { user: serializeUser(req.user) } });
});

const updateMe = asyncHandler(async (req, res) => {
  const data = {};
  if (req.body.name !== undefined) data.name = req.body.name;
  if (req.body.avatar !== undefined) data.avatar = req.body.avatar || null;

  const user = await prisma.user.update({ where: { id: req.user.id }, data });
  res.status(200).json({ success: true, message: "Profile updated.", data: { user: serializeUser(user) } });
});

// Shared by any logged-in account (customer or seller) — unlike the
// product-image upload, this isn't seller-only.
const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "No image file was uploaded.");
  }
  const url = `/images/uploads/${req.file.filename}`;
  res.status(201).json({ success: true, data: { url } });
});

module.exports = { getMe, updateMe, uploadAvatar };
