const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const { trackEvent, getSummary } = require("../controllers/analyticsController");

router.post("/track", trackEvent);
router.get("/summary", protect, adminOnly, getSummary);

module.exports = router;
