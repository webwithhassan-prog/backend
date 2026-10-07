const mongoose = require("mongoose");

// A problem reported from the site's "Report an issue" form (footer, any
// page). Shown on the admin Reported Issues page; each new one is also
// emailed to the monitored inbox.
const issueReportSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 100, default: "" },
    // Email or WhatsApp number, so the team can follow up — optional.
    contact: { type: String, trim: true, maxlength: 150, default: "" },
    // The page they were on when they opened the form.
    page: { type: String, trim: true, maxlength: 300, default: "" },
    message: { type: String, trim: true, required: true, maxlength: 2000 },
    status: { type: String, enum: ["open", "resolved"], default: "open" },
  },
  { timestamps: true },
);

issueReportSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("IssueReport", issueReportSchema);
