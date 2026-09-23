const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const {
  regenerateSchedule,
  getZoomLink,
  setZoomLink,
} = require("../controllers/timetableController");

router.post("/regenerate", protect, adminOnly, regenerateSchedule);
router.get("/zoom-link", protect, adminOnly, getZoomLink);
router.put("/zoom-link", protect, adminOnly, setZoomLink);

module.exports = router;
