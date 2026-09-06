const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const {
  getTransformationVideos,
  createTransformationVideo,
  updateTransformationVideo,
  deleteTransformationVideo,
} = require("../controllers/transformationVideoController");

router.get("/public", getTransformationVideos);

router.get("/", protect, adminOnly, getTransformationVideos);
router.post("/", protect, adminOnly, createTransformationVideo);
router.put("/:id", protect, adminOnly, updateTransformationVideo);
router.delete("/:id", protect, adminOnly, deleteTransformationVideo);

module.exports = router;
