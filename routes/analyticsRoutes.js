const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const { publicLimiter } = require("../middleware/security");
const { trackEvent, getSummary } = require("../controllers/analyticsController");

router.post("/track", publicLimiter, trackEvent);
router.get("/summary", protect, adminOnly, getSummary);

module.exports = router;
