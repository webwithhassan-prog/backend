const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const clientOnly = require("../middleware/clientOnly");
const {
  createBooking,
  getClientBookings,
  cancelBooking,
} = require("../controllers/bookingController");

router.post("/", protect, clientOnly, createBooking);
router.get("/:clientId", protect, clientOnly, getClientBookings);
router.put("/:id/cancel", protect, clientOnly, cancelBooking);

module.exports = router;
