const express = require("express");
const router = express.Router();
const { cachePublic } = require("../middleware/responseCache");
const { protect } = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const {
  getPublicPlans,
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
} = require("../controllers/planController");

router.get("/public", cachePublic(), getPublicPlans);

router.get("/", protect, adminOnly, getPlans);
router.post("/", protect, adminOnly, createPlan);
router.put("/:id", protect, adminOnly, updatePlan);
router.delete("/:id", protect, adminOnly, deletePlan);

module.exports = router;
