const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const {
  getConsultants,
  createConsultant,
  updateConsultant,
  deleteConsultant,
  getPublicConsultants,
  banConsultant,
  unbanConsultant,
} = require("../controllers/consultantController");

router.get("/", protect, adminOnly, getConsultants);
router.post("/", protect, adminOnly, createConsultant);
router.put("/:id", protect, adminOnly, updateConsultant);
router.delete("/:id", protect, adminOnly, deleteConsultant);
router.put("/:id/ban", protect, adminOnly, banConsultant);
router.put("/:id/unban", protect, adminOnly, unbanConsultant);
router.get("/public", getPublicConsultants);

module.exports = router;
