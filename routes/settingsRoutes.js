const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const { getSettings, getAdminSettings, updateSettings } = require("../controllers/settingsController");

router.get("/", getSettings);
router.get("/admin", protect, adminOnly, getAdminSettings);
router.put("/", protect, adminOnly, updateSettings);

module.exports = router;
