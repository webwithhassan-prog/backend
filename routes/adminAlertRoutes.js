const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const { getAdminAlerts } = require("../controllers/adminAlertController");

router.get("/", protect, adminOnly, getAdminAlerts);

module.exports = router;
