const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const clientOnly = require("../middleware/clientOnly");
const {
  getToday,
  setToday,
  getRecentActivity,
} = require("../controllers/dailyLogController");

router.get("/today", protect, clientOnly, getToday);
router.put("/today", protect, clientOnly, setToday);
router.get("/recent-activity", getRecentActivity);

module.exports = router;
