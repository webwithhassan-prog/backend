const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const {
  regenerateSchedule,
  getZoomLink,
  rotateZoomLinkNow,
} = require("../controllers/timetableController");

router.post("/regenerate", protect, adminOnly, regenerateSchedule);
router.get("/zoom-link", protect, adminOnly, getZoomLink);
router.post("/zoom-link/rotate", protect, adminOnly, rotateZoomLinkNow);

module.exports = router;
