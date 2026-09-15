const Booking = require("../models/Booking");
const Client = require("../models/Client");
const Class = require("../models/Class");

// @desc Create a class booking
const createBooking = async (req, res) => {
  const { class_id } = req.body;

  try {
    // client_id is resolved from the logged-in caller, never trusted from
    // the body — otherwise any client could book (or occupy capacity on)
    // any other client's account just by naming their id.
    const client = await Client.findOne({ user_ref: req.user._id });
    if (!client) return res.status(404).json({ message: "Client not found" });
    const client_id = client._id;

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
    const client = await Client.findById(req.params.clientId);
    if (!client) return res.status(404).json({ message: "Client not found" });

    if (
      req.user.role === "client" &&
      client.user_ref.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const bookings = await Booking.find({
      client_ref: req.params.clientId,
    }).populate("class_ref");
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Cancel a booking — only the booking's own client (or an admin)
const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (req.user.role !== "admin") {
      const client = await Client.findById(booking.client_ref);
      if (!client || client.user_ref.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Not authorized" });
      }
    }

    booking.status = "cancelled";
    await booking.save();
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createBooking, getClientBookings, cancelBooking };
