const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  registerClient,
  login,
  changePassword,
  forgotPassword,
  resetPassword,
  debugTestEmail,
} = require("../controllers/authController");

router.post("/register", registerClient);
router.post("/login", login);
router.put("/change-password", protect, changePassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.get("/debug-test-email", debugTestEmail); // TEMPORARY — remove after use

module.exports = router;
