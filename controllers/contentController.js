const RecordedContent = require("../models/RecordedContent");
const Client = require("../models/Client");

// @desc Get all recorded content (admin — no gating)
const getAllContent = async (req, res) => {
  try {
    const content = await RecordedContent.find();
    res.json(content);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Get content for logged-in client (only if subscription active)
const getClientContent = async (req, res) => {
  try {
    const client = await Client.findById(req.params.clientId);
    if (!client) return res.status(404).json({ message: "Client not found" });

    if (client.status !== "active") {
      return res.status(403).json({ message: "Subscription not active" });
    }

    const content = await RecordedContent.find();
    res.json(content);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Create content
const createContent = async (req, res) => {
  try {
    const content = await RecordedContent.create(req.body);
    res.status(201).json(content);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Update content
const updateContent = async (req, res) => {
  try {
    const updated = await RecordedContent.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );
    if (!updated) return res.status(404).json({ message: "Content not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Delete content
const deleteContent = async (req, res) => {
  try {
    const deleted = await RecordedContent.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Content not found" });
    res.json({ message: "Content removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getAllContent,
  getClientContent,
  createContent,
  updateContent,
  deleteContent,
};
