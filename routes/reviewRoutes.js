const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const {
  createReview,
  getConsultantReviews,
  getAllReviews,
} = require("../controllers/reviewController");

router.get("/consultant/:consultantId", getConsultantReviews);
router.get("/", protect, adminOnly, getAllReviews);
router.post("/", protect, createReview);

module.exports = router;
