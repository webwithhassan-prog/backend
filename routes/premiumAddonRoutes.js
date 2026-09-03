const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const {
  getPublicPremiumAddon,
  getPremiumAddon,
  createPremiumAddon,
  updatePremiumAddon,
} = require("../controllers/premiumAddonController");

router.get("/public", getPublicPremiumAddon);

router.get("/", protect, adminOnly, getPremiumAddon);
router.post("/", protect, adminOnly, createPremiumAddon);
router.put("/:id", protect, adminOnly, updatePremiumAddon);

module.exports = router;
