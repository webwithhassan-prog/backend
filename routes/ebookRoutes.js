const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const {
  getPublicEbooks,
  getEbooks,
  createEbook,
  updateEbook,
  deleteEbook,
} = require("../controllers/ebookController");

router.get("/public", getPublicEbooks);

router.get("/", protect, adminOnly, getEbooks);
router.post("/", protect, adminOnly, createEbook);
router.put("/:id", protect, adminOnly, updateEbook);
router.delete("/:id", protect, adminOnly, deleteEbook);

module.exports = router;
