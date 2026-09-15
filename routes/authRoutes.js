const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { authLimiter, rejectBots } = require("../middleware/security");
const {
  registerClient,
  login,
  changePassword,
  forgotPassword,
  resetPassword,
  completeAccountSetup,
} = require("../controllers/authController");

router.post("/register", authLimiter, rejectBots, registerClient);
router.post("/login", authLimiter, login);
router.put("/change-password", protect, changePassword);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password/:token", authLimiter, resetPassword);
router.post("/complete-account", authLimiter, completeAccountSetup);

module.exports = router;
