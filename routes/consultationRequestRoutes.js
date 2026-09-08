const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const {
  getRequests,
  scheduleRequest,
  declineRequest,
} = require("../controllers/consultationRequestController");

router.get("/", protect, adminOnly, getRequests);
router.put("/:id/schedule", protect, adminOnly, scheduleRequest);
router.put("/:id/decline", protect, adminOnly, declineRequest);

module.exports = router;
