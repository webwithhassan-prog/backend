const Trainer = require("../models/Trainer");

// @desc Get all trainers
const getTrainers = async (req, res) => {
  try {
    const trainers = await Trainer.find();
    res.json(trainers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Create a trainer
const createTrainer = async (req, res) => {
  try {
    const trainer = await Trainer.create(req.body);
    res.status(201).json(trainer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Update a trainer
const updateTrainer = async (req, res) => {
  try {
    const trainer = await Trainer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!trainer) return res.status(404).json({ message: "Trainer not found" });
    res.json(trainer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Delete a trainer
const deleteTrainer = async (req, res) => {
  try {
    const trainer = await Trainer.findByIdAndDelete(req.params.id);
    if (!trainer) return res.status(404).json({ message: "Trainer not found" });
    res.json({ message: "Trainer removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// @desc Get trainers (public — limited fields only)
const getPublicTrainers = async (req, res) => {
  try {
    const trainers = await Trainer.find().select("name specialty");
    res.json(trainers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getTrainers,
  createTrainer,
  updateTrainer,
  deleteTrainer,
  getPublicTrainers,
};
