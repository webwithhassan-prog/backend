const TimeSlot = require("../models/TimeSlot");

// @desc Get all time slots. Fields are listed explicitly: older slot
// documents still carry zoom_join_url/zoom_meeting_id from before the Zoom
// link moved to Settings, and this also serves the public /time-slots/public
// route — returning whole documents handed those join links to anyone.
const getTimeSlots = async (req, res) => {
  try {
    const slots = await TimeSlot.find()
      .select("trainer_ref hour minute")
      .populate("trainer_ref", "name");
    res.json(slots);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Create a time slot
const createTimeSlot = async (req, res) => {
  try {
    const slot = await TimeSlot.create(req.body);
    res.status(201).json(slot);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Update a time slot
const updateTimeSlot = async (req, res) => {
  try {
    const slot = await TimeSlot.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!slot) return res.status(404).json({ message: "Time slot not found" });
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
    res.json({ message: "Time slot removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getTimeSlots,
  createTimeSlot,
  updateTimeSlot,
  deleteTimeSlot,
};
