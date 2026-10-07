const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const { reportLimiter, rejectBots } = require("../middleware/security");
const {
  createIssueReport,
  getIssueReports,
  updateIssueReport,
  deleteIssueReport,
} = require("../controllers/issueReportController");

router.post("/", reportLimiter, rejectBots, createIssueReport);

router.get("/", protect, adminOnly, getIssueReports);
router.put("/:id", protect, adminOnly, updateIssueReport);
router.delete("/:id", protect, adminOnly, deleteIssueReport);

module.exports = router;
