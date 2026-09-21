const asyncHandler = require("../utils/asyncHandler");
const authService = require("../services/authService");
const { serializeUser } = require("../utils/serializers");

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, businessName } = req.body;
  const { user, token } = await authService.register({ name, email, password, role, businessName });

  res.cookie("token", token, COOKIE_OPTIONS);
  res.status(201).json({
    success: true,
    message: "Account created.",
    data: { user: serializeUser(user), token },
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user, token } = await authService.login({ email, password });

  res.cookie("token", token, COOKIE_OPTIONS);
  res.status(200).json({
    success: true,
    message: "Welcome back.",
    data: { user: serializeUser(user), token },
  });
});

const me = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: { user: serializeUser(req.user) } });
});

const logout = asyncHandler(async (req, res) => {
  res.clearCookie("token", COOKIE_OPTIONS);
  res.status(200).json({ success: true, message: "Logged out." });
});

module.exports = { register, login, me, logout };
