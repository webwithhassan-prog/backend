const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const {
  getTestimonials,
  createTestimonial,
  deleteTestimonial,
} = require("../controllers/testimonialController");

router.get("/public", getTestimonials);

router.get("/", protect, adminOnly, getTestimonials);
router.post("/", protect, adminOnly, createTestimonial);
router.delete("/:id", protect, adminOnly, deleteTestimonial);

module.exports = router;
