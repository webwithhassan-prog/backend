const Booking = require("../models/Booking");
const Client = require("../models/Client");
const Class = require("../models/Class");

// @desc Logged-in client joins via booking ID (protected redirect)
const joinViaBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId).populate(
      "class_ref",
    );

    if (!booking) return res.status(404).send("Booking not found");
    if (
      booking.client_ref.toString() !== req.user.client_id?.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).send("Not your booking");
    }
    if (booking.status !== "booked") {
      return res.status(403).send("Booking is not active");
    }

    const client = await Client.findById(booking.client_ref);
    if (!client || client.status !== "active") {
      return res.status(403).send("Subscription not active");
    }

    const session = booking.class_ref;
    if (!session || !session.zoom_join_url) {
      return res.status(404).send("Zoom link not available");
    }

    return res.redirect(302, session.zoom_join_url);
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// @desc Client joins a class directly (no booking needed) — for clients with an active
// Workout package. Verified via client_id query param since this is a plain browser
// navigation link and can't carry an Authorization header.
const joinViaClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const { client_id } = req.query;

    if (!client_id) return res.status(400).send("Missing client_id");

    const client = await Client.findById(client_id);
    if (!client) return res.status(404).send("Client not found");
    if (client.status !== "active")
      return res.status(403).send("Subscription not active");
    if (!client.has_workout)
      return res.status(403).send("Workout package not active");

    const classDoc = await Class.findById(classId);
    if (!classDoc) return res.status(404).send("Class not found");
    if (!classDoc.zoom_join_url)
      return res.status(404).send("Zoom link not available yet");

    return res.redirect(302, classDoc.zoom_join_url);
  } catch (err) {
    res.status(500).send(err.message);
  }
};

const normalizeDigits = (str) => (str || "").replace(/\D/g, "");

// Numbers saved before the country-code picker existed have no "+<dial>"
// prefix; numbers saved after it always do. An exact-string match would
// silently break lookup for every pre-existing client, so this compares by
// trailing digits instead — whichever number is shorter just needs to match
// the end of the longer one, covering a country code present on only one
// side. The length floor keeps a handful of stray digits from matching by
// coincidence; real phone numbers are always well past it.
const phoneNumbersMatch = (a, b) => {
  const na = normalizeDigits(a);
  const nb = normalizeDigits(b);
  if (na.length < 7 || nb.length < 7) return false;
  return na.endsWith(nb) || nb.endsWith(na);
};

// @desc Access via name + number lookup (no login required)
const joinViaLookup = async (req, res) => {
  const { name, phone_number, class_id } = req.body;

  try {
    const candidates = await Client.find({ name });
    const client = candidates.find((c) =>
      phoneNumbersMatch(c.phone_number, phone_number),
    );
    if (!client) {
      return res.status(404).json({ message: "No matching client found" });
    }
    if (client.status !== "active") {
      return res.status(403).json({ message: "Subscription not active" });
    }

    const session = await Class.findById(class_id);
    if (!session || !session.zoom_join_url) {
      return res.status(404).json({ message: "Zoom link not available" });
    }

    return res.json({ join_url: session.zoom_join_url });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { joinViaBooking, joinViaClass, joinViaLookup };
