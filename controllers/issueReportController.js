const IssueReport = require("../models/IssueReport");
const { sendIssueReportAlertEmail } = require("../services/emailService");

const asText = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");

// @desc Report a problem with the site (public)
const createIssueReport = async (req, res) => {
  try {
    const message = asText(req.body.message, 2000);
    if (message.length < 5) {
      return res
        .status(400)
        .json({ message: "Please describe the problem in a few words." });
    }
    const report = await IssueReport.create({
      name: asText(req.body.name, 100),
      contact: asText(req.body.contact, 150),
      page: asText(req.body.page, 300),
      message,
    });

    // The report is saved either way; the email is a heads-up.
    sendIssueReportAlertEmail(report).catch((err) =>
      console.error("Issue report email failed:", err.message),
    );

    res.status(201).json({ message: "Thanks — your report has been sent." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc List reported issues, open first (admin)
const getIssueReports = async (req, res) => {
  try {
    const reports = await IssueReport.find()
      .sort({ status: 1, createdAt: -1 })
      .limit(200);
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Mark a report open/resolved (admin)
const updateIssueReport = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["open", "resolved"].includes(status)) {
      return res.status(400).json({ message: "Status must be open or resolved." });
    }
    const report = await IssueReport.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    );
    if (!report) return res.status(404).json({ message: "Report not found" });
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Delete a report (admin)
const deleteIssueReport = async (req, res) => {
  try {
    const report = await IssueReport.findByIdAndDelete(req.params.id);
    if (!report) return res.status(404).json({ message: "Report not found" });
    res.json({ message: "Report deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createIssueReport,
  getIssueReports,
  updateIssueReport,
  deleteIssueReport,
};
