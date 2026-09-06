const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const {
  getDemoVideos,
  createDemoVideo,
  updateDemoVideo,
  deleteDemoVideo,
} = require("../controllers/demoVideoController");

router.get("/public", getDemoVideos);

router.get("/", protect, adminOnly, getDemoVideos);
router.post("/", protect, adminOnly, createDemoVideo);
router.put("/:id", protect, adminOnly, updateDemoVideo);
router.delete("/:id", protect, adminOnly, deleteDemoVideo);

module.exports = router;
