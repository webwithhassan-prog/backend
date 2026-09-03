const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const clientOnly = require("../middleware/clientOnly");
const {
  createRequest,
  getMyRequests,
  getRequests,
  scheduleRequest,
  declineRequest,
} = require("../controllers/consultationRequestController");

router.post("/", protect, clientOnly, createRequest);
router.get("/mine", protect, clientOnly, getMyRequests);

router.get("/", protect, adminOnly, getRequests);
router.put("/:id/schedule", protect, adminOnly, scheduleRequest);
router.put("/:id/decline", protect, adminOnly, declineRequest);

module.exports = router;
