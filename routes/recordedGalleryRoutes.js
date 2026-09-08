const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const {
  getAllRecordings,
  getClientRecordings,
  createRecording,
  updateRecording,
  deleteRecording,
} = require("../controllers/recordedGalleryController");

router.get("/", protect, adminOnly, getAllRecordings);
router.post("/", protect, adminOnly, createRecording);
router.put("/:id", protect, adminOnly, updateRecording);
router.delete("/:id", protect, adminOnly, deleteRecording);

router.get("/client/:clientId", protect, getClientRecordings);

module.exports = router;
