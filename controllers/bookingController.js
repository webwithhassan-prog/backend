const Booking = require("../models/Booking");
const Client = require("../models/Client");
const Class = require("../models/Class");

// @desc Create a class booking
const createBooking = async (req, res) => {
  const { client_id, class_id } = req.body;

  try {
    const client = await Client.findById(client_id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    if (client.status !== "active") {
      return res
        .status(403)
        .json({ message: "Client subscription is not active" });
    }

    if (!class_id) {
      return res.status(400).json({ message: "class_id required" });
    }

    const classDoc = await Class.findById(class_id);
    if (!classDoc)
      return res.status(404).json({ message: "Class not found" });

    // A null/unset capacity means unlimited (the default) — only enforce
    // a cap when a specific session has one explicitly set.
    if (classDoc.capacity) {
      const existingBookings = await Booking.countDocuments({
        class_ref: class_id,
        status: "booked",
      });
      if (existingBookings >= classDoc.capacity) {
        return res.status(400).json({ message: "Class is full" });
      }
    }

    const booking = await Booking.create({
      client_ref: client_id,
      class_ref: class_id,
    });
    return res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Get bookings for a specific client
const getClientBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({
      client_ref: req.params.clientId,
    }).populate("class_ref");
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Cancel a booking
const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: "cancelled" },
      { new: true },
    );
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createBooking, getClientBookings, cancelBooking };
