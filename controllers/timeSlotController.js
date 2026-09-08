const TimeSlot = require("../models/TimeSlot");
const { deleteZoomMeeting } = require("../services/zoomService");
const { rotateSlotZoomLink } = require("../utils/zoomLinkRotation");

// @desc Get all time slots
const getTimeSlots = async (req, res) => {
  try {
    const slots = await TimeSlot.find().populate("trainer_ref", "name");
    res.json(slots);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Create a time slot — immediately provisions its Zoom link rather
// than leaving it without one until the next daily rotation check
const createTimeSlot = async (req, res) => {
  try {
    const slot = await TimeSlot.create(req.body);
    try {
      await slot.populate("trainer_ref", "name");
      await rotateSlotZoomLink(slot);
    } catch (zoomErr) {
      console.error("Could not provision Zoom link for new slot:", zoomErr.message);
    }
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

// @desc Delete a time slot — also tears down its Zoom meeting so the link
// doesn't keep working after the slot is gone
const deleteTimeSlot = async (req, res) => {
  try {
    const slot = await TimeSlot.findByIdAndDelete(req.params.id);
    if (!slot) return res.status(404).json({ message: "Time slot not found" });
    if (slot.zoom_meeting_id) {
      try {
        await deleteZoomMeeting(slot.zoom_meeting_id);
      } catch (zoomErr) {
        console.error("Could not delete Zoom meeting for removed slot:", zoomErr.message);
      }
    }
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
