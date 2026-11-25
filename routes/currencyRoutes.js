const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const {
  detectLocalCurrency,
  getRates,
  getCurrencySettings,
  updateCurrencySettings,
} = require("../controllers/currencyController");

router.get("/detect", detectLocalCurrency);
router.get("/rates", getRates);

// Admin — which currencies the price dropdown offers
router.get("/admin", protect, adminOnly, getCurrencySettings);
router.put("/admin", protect, adminOnly, updateCurrencySettings);

module.exports = router;
