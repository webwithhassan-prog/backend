const RecordedGallery = require("../models/RecordedGallery");
const Client = require("../models/Client");

// @desc Get all recordings (admin — no gating)
const getAllRecordings = async (req, res) => {
  try {
    const recordings = await RecordedGallery.find().sort({ createdAt: -1 });
    res.json(recordings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Get recordings for a logged-in client — only workout/combo clients
// with an active subscription see this; dietplan-only clients don't
const getClientRecordings = async (req, res) => {
  try {
    const client = await Client.findById(req.params.clientId);
    if (!client) return res.status(404).json({ message: "Client not found" });

    if (client.status !== "active") {
      return res.status(403).json({ message: "Subscription not active" });
    }
    if (!client.has_workout) {
      return res
        .status(403)
        .json({ message: "Recorded Gallery is for live-session clients" });
    }

    const recordings = await RecordedGallery.find().sort({ createdAt: -1 });
    res.json(recordings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Add a recording
const createRecording = async (req, res) => {
  try {
    const recording = await RecordedGallery.create(req.body);
    res.status(201).json(recording);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Update a recording
const updateRecording = async (req, res) => {
  try {
    const updated = await RecordedGallery.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );
    if (!updated) return res.status(404).json({ message: "Recording not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Delete a recording
const deleteRecording = async (req, res) => {
  try {
    const deleted = await RecordedGallery.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Recording not found" });
    res.json({ message: "Recording removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getAllRecordings,
  getClientRecordings,
  createRecording,
  updateRecording,
  deleteRecording,
};
