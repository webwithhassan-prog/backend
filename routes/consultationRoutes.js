const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const {
  getConsultations,
  getClientConsultations,
  createConsultation,
  updateConsultation,
  deleteConsultation,
} = require("../controllers/consultationController");

router.get("/client/:clientId", protect, getClientConsultations);
router.get("/", protect, adminOnly, getConsultations);
router.post("/", protect, adminOnly, createConsultation);
router.put("/:id", protect, adminOnly, updateConsultation);
router.delete("/:id", protect, adminOnly, deleteConsultation);

module.exports = router;
