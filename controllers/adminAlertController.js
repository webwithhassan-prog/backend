const SalesLog = require("../models/SalesLog");
const IssueReport = require("../models/IssueReport");
const { describeSale } = require("../utils/saleAlerts");

// @desc Recent sales and open issue reports for the admin dashboard's alert
// bell, which polls this and pops a notice when something new arrives.
const getAdminAlerts = async (req, res) => {
  try {
    const [sales, openIssues, latestIssues] = await Promise.all([
      SalesLog.find().sort({ date: -1 }).limit(15),
      IssueReport.countDocuments({ status: "open" }),
      IssueReport.find({ status: "open" })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("name message page createdAt"),
    ]);
    res.json({
      sales: await Promise.all(sales.map(describeSale)),
      openIssues,
      latestIssues,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAdminAlerts };
