const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  joinViaBooking,
  joinViaClass,
  joinViaLookup,
} = require("../controllers/zoomController");

// Logged-in flow — clicking "Join Class" navigates here directly (legacy, booking-based)
router.get("/booking/:bookingId", protect, joinViaBooking);

// Client joins a class directly — no booking, verified via client_id query param
router.get("/class/:classId", joinViaClass);

// Name + number lookup flow — no login required
router.post("/lookup", joinViaLookup);

module.exports = router;
