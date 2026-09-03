const Booking = require("../models/Booking");
const Client = require("../models/Client");
const Class = require("../models/Class");
const Consultation = require("../models/Consultation");

// @desc Create a booking (class or consultation)
const createBooking = async (req, res) => {
  const { client_id, class_id, consultation_id } = req.body;

  try {
    const client = await Client.findById(client_id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    if (client.status !== "active") {
      return res
        .status(403)
        .json({ message: "Client subscription is not active" });
    }

    if (class_id) {
      const classDoc = await Class.findById(class_id);
      if (!classDoc)
        return res.status(404).json({ message: "Class not found" });

      const existingBookings = await Booking.countDocuments({
        class_ref: class_id,
        status: "booked",
      });
      if (existingBookings >= classDoc.capacity) {
        return res.status(400).json({ message: "Class is full" });
      }

      const booking = await Booking.create({
        client_ref: client_id,
        class_ref: class_id,
      });
      return res.status(201).json(booking);
    }

    if (consultation_id) {
      const consultationDoc = await Consultation.findById(consultation_id);
      if (!consultationDoc)
        return res.status(404).json({ message: "Consultation not found" });

      const booking = await Booking.create({
        client_ref: client_id,
        consultation_ref: consultation_id,
      });
      return res.status(201).json(booking);
    }

    return res
      .status(400)
      .json({ message: "class_id or consultation_id required" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Get bookings for a specific client
const getClientBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ client_ref: req.params.clientId })
      .populate("class_ref")
      .populate("consultation_ref");
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
