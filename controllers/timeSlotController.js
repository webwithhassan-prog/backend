const TimeSlot = require("../models/TimeSlot");
const { runRegeneration } = require("./timetableController");

// Public view of a slot: when it runs, never its Zoom link (that's only
// handed out to clients through /join). Fields are listed explicitly —
// older slot documents still carry zoom_join_url/zoom_meeting_id from
// before the Zoom link moved to Settings.
const PUBLIC_FIELDS = "trainer_ref hour minute days";

// @desc Public — class times and the days each one runs on
const getPublicTimeSlots = async (req, res) => {
  try {
    const slots = await TimeSlot.find()
      .select(PUBLIC_FIELDS)
      .populate("trainer_ref", "name")
      .sort({ hour: 1, minute: 1 });
    res.json(slots);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Admin — slots including each one's own Zoom link
const getTimeSlots = async (req, res) => {
  try {
    const slots = await TimeSlot.find()
      .select(`${PUBLIC_FIELDS} class_zoom_url`)
      .populate("trainer_ref", "name")
      .sort({ hour: 1, minute: 1 });
    res.json(slots);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Only these fields can be set, each checked — req.body used to be saved
// as-is.
const slotFields = (body) => {
  const out = {};
  if (body.trainer_ref !== undefined) out.trainer_ref = body.trainer_ref;
  if (body.hour !== undefined) out.hour = Number(body.hour);
  if (body.minute !== undefined) out.minute = Number(body.minute);
  if (body.days !== undefined) {
    const days = [...new Set((Array.isArray(body.days) ? body.days : []).map(Number))]
      .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
      .sort();
    if (days.length === 0) throw new Error("Pick at least one day for this class");
    out.days = days;
  }
  if (body.class_zoom_url !== undefined) {
    const raw = String(body.class_zoom_url || "").trim();
    if (!raw) {
      out.class_zoom_url = null;
    } else {
      let url;
      try {
        url = new URL(raw);
      } catch {
        throw new Error("Enter a valid Zoom link, e.g. https://us06web.zoom.us/j/…");
      }
      if (url.protocol !== "https:") throw new Error("The Zoom link must start with https://");
      out.class_zoom_url = url.toString();
    }
  }
  return out;
};

// Classes for the next 7 days are generated from the slots; regenerate
// straight away so a changed time, day or Zoom link reaches clients now,
// not at the next daily run.
const regenerateQuietly = () =>
  runRegeneration().catch((err) => console.error("Regeneration after slot change failed:", err.message));

// @desc Create a time slot
const createTimeSlot = async (req, res) => {
  let fields;
  try {
    fields = slotFields(req.body);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
  try {
    const slot = await TimeSlot.create(fields);
    await regenerateQuietly();
    res.status(201).json(slot);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Update a time slot
const updateTimeSlot = async (req, res) => {
  let fields;
  try {
    fields = slotFields(req.body);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
  try {
    const slot = await TimeSlot.findByIdAndUpdate(req.params.id, fields, {
      returnDocument: "after",
      runValidators: true,
    });
    if (!slot) return res.status(404).json({ message: "Time slot not found" });
    await regenerateQuietly();
    res.json(slot);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Delete a time slot
const deleteTimeSlot = async (req, res) => {
  try {
    const slot = await TimeSlot.findByIdAndDelete(req.params.id);
    if (!slot) return res.status(404).json({ message: "Time slot not found" });
    await regenerateQuietly();
    res.json({ message: "Time slot removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getPublicTimeSlots,
  getTimeSlots,
  createTimeSlot,
  updateTimeSlot,
  deleteTimeSlot,
};
