const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const {
  getPublicMethodsForCountry,
  getAllMethods,
  createMethod,
  updateMethod,
  deleteMethod,
} = require("../controllers/manualPaymentMethodController");

router.get("/public", getPublicMethodsForCountry);
router.get("/", protect, adminOnly, getAllMethods);
router.post("/", protect, adminOnly, createMethod);
router.put("/:id", protect, adminOnly, updateMethod);
router.delete("/:id", protect, adminOnly, deleteMethod);

module.exports = router;
