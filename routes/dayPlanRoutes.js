const express = require("express");
const router = express.Router();
const { cachePublic } = require("../middleware/responseCache");
const { protect } = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const { getDayPlans, setDayPlan } = require("../controllers/dayPlanController");

router.get("/public", cachePublic(), getDayPlans);

router.get("/", protect, adminOnly, getDayPlans);
router.put("/:day_of_week", protect, adminOnly, setDayPlan);

module.exports = router;
