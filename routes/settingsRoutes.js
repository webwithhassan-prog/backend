const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const { getSettings, updateSettings } = require("../controllers/settingsController");

router.get("/", getSettings);
router.put("/", protect, adminOnly, updateSettings);

module.exports = router;
