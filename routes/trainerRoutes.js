const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const {
  getTrainers,
  createTrainer,
  updateTrainer,
  deleteTrainer,
  getPublicTrainers,
} = require("../controllers/trainerController");

router.get("/", protect, adminOnly, getTrainers);
router.post("/", protect, adminOnly, createTrainer);
router.put("/:id", protect, adminOnly, updateTrainer);
router.delete("/:id", protect, adminOnly, deleteTrainer);
router.get("/public", getPublicTrainers);

module.exports = router;
