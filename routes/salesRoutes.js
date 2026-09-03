const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const {
  getSalesSummary,
  getSalesByCategory,
} = require("../controllers/salesController");

router.get("/summary", protect, adminOnly, getSalesSummary);
router.get("/search", protect, adminOnly, getSalesByCategory);

module.exports = router;
