const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const {
  getTimeSlots,
  createTimeSlot,
  updateTimeSlot,
  deleteTimeSlot,
} = require("../controllers/timeSlotController");

router.get("/", protect, adminOnly, getTimeSlots);
router.post("/", protect, adminOnly, createTimeSlot);
router.put("/:id", protect, adminOnly, updateTimeSlot);
router.delete("/:id", protect, adminOnly, deleteTimeSlot);

module.exports = router;
