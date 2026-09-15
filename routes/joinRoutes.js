const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { authLimiter, checkoutLimiter } = require("../middleware/security");
const {
  joinViaBooking,
  joinViaClass,
  joinViaLookup,
} = require("../controllers/zoomController");

// Logged-in flow — clicking "Join Class" navigates here directly (legacy, booking-based)
router.get("/booking/:bookingId", protect, joinViaBooking);

// Client joins a class directly — no booking, verified via client_id query
// param. Rate-limited since client_id is a guessable Mongo id and this
// hands back a real Zoom link on success.
router.get("/class/:classId", checkoutLimiter, joinViaClass);

// Name + number lookup flow — no login required. This is a guessing-attack
// surface (name + phone digits) that hands back a real Zoom link on a
// match, so it gets the strict auth-style limiter, not the loose one.
router.post("/lookup", authLimiter, joinViaLookup);

module.exports = router;
