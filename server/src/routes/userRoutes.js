const express = require("express");
const userController = require("../controllers/userController");
const { requireAuth } = require("../middleware/authMiddleware");
const { validateProfileUpdate } = require("../validators/userValidators");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.get("/me", requireAuth, userController.getMe);
router.patch("/me", requireAuth, validateProfileUpdate, userController.updateMe);
router.post("/avatar", requireAuth, upload.single("image"), userController.uploadAvatar);

module.exports = router;
