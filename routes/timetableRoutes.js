const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const { regenerateSchedule } = require("../controllers/timetableController");

router.post("/regenerate", protect, adminOnly, regenerateSchedule);

module.exports = router;
