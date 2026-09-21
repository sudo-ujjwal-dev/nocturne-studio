const express = require("express");
const authController = require("../controllers/authController");
const { requireAuth } = require("../middleware/authMiddleware");
const { validateRegister, validateLogin } = require("../validators/authValidators");

const router = express.Router();

// Express 4 forwards synchronous throws from middleware to the error
// handler automatically, so the validators don't need asyncHandler.
router.post("/register", validateRegister, authController.register);
router.post("/login", validateLogin, authController.login);
router.get("/me", requireAuth, authController.me);
router.post("/logout", authController.logout);

module.exports = router;
