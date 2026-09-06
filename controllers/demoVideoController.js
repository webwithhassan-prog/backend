const DemoVideo = require("../models/DemoVideo");

// @desc Get all demo videos (public + admin use the same list)
const getDemoVideos = async (req, res) => {
  try {
    const videos = await DemoVideo.find().sort({ order: 1, createdAt: 1 });
    res.json(videos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Create a demo video (admin)
const createDemoVideo = async (req, res) => {
  try {
    const video = await DemoVideo.create(req.body);
    res.status(201).json(video);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Update a demo video's title/link (admin)
const updateDemoVideo = async (req, res) => {
  try {
    const video = await DemoVideo.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!video) return res.status(404).json({ message: "Video not found" });
    res.json(video);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Delete a demo video (admin)
const deleteDemoVideo = async (req, res) => {
  try {
    const video = await DemoVideo.findByIdAndDelete(req.params.id);
    if (!video) return res.status(404).json({ message: "Video not found" });
    res.json({ message: "Video removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getDemoVideos,
  createDemoVideo,
  updateDemoVideo,
  deleteDemoVideo,
};
