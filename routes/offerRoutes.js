const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const {
  getActiveOffers,
  getOffers,
  createOffer,
  updateOffer,
  deleteOffer,
} = require("../controllers/offerController");

router.get("/public", getActiveOffers);

router.get("/", protect, adminOnly, getOffers);
router.post("/", protect, adminOnly, createOffer);
router.put("/:id", protect, adminOnly, updateOffer);
router.delete("/:id", protect, adminOnly, deleteOffer);

module.exports = router;
