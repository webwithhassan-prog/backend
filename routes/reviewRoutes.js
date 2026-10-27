const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const clientOnly = require("../middleware/clientOnly");
const { cachePublic } = require("../middleware/responseCache");
const { reportLimiter } = require("../middleware/security");
const {
  getMyReview,
  saveMyReview,
  getPublicReviews,
  getReviews,
  updateReviewStatus,
  deleteReview,
} = require("../controllers/reviewController");

router.get("/public", cachePublic(), getPublicReviews);

router.get("/mine", protect, clientOnly, getMyReview);
router.post("/mine", protect, clientOnly, reportLimiter, saveMyReview);

router.get("/", protect, adminOnly, getReviews);
router.put("/:id", protect, adminOnly, updateReviewStatus);
router.delete("/:id", protect, adminOnly, deleteReview);

module.exports = router;
