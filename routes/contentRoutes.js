const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");

const {
  getAllContent,
  getClientContent,
  createContent,
  updateContent,
  deleteContent,
} = require("../controllers/contentController");

// Admin routes
router.get("/", protect, adminOnly, getAllContent);
router.post("/", protect, adminOnly, createContent);
router.put("/:id", protect, adminOnly, updateContent);
router.delete("/:id", protect, adminOnly, deleteContent);

// Client route (subscription-gated)
router.get("/client/:clientId", protect, getClientContent);

module.exports = router;
