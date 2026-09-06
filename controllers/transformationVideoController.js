const TransformationVideo = require("../models/TransformationVideo");

// @desc Get all transformation videos (public + admin use the same list)
const getTransformationVideos = async (req, res) => {
  try {
    const videos = await TransformationVideo.find().sort({
      order: 1,
      createdAt: 1,
    });
    res.json(videos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Create a transformation video (admin)
const createTransformationVideo = async (req, res) => {
  try {
    const video = await TransformationVideo.create(req.body);
    res.status(201).json(video);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Update a transformation video's title/link (admin)
const updateTransformationVideo = async (req, res) => {
  try {
    const video = await TransformationVideo.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );
    if (!video) return res.status(404).json({ message: "Video not found" });
    res.json(video);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Delete a transformation video (admin)
const deleteTransformationVideo = async (req, res) => {
  try {
    const video = await TransformationVideo.findByIdAndDelete(req.params.id);
    if (!video) return res.status(404).json({ message: "Video not found" });
    res.json({ message: "Video removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getTransformationVideos,
  createTransformationVideo,
  updateTransformationVideo,
  deleteTransformationVideo,
};
