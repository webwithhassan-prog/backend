const Payment = require('../models/Payment');
const SalesLog = require('../models/SalesLog');
const { inrToGbpPence } = require('../utils/currency');
const { startOfDayPKT, startOfMonthPKT } = require('../utils/pktTime');

// For records predating the amount_settled field (or any edge case where it
// wasn't set), fall back to converting the INR amount at today's rate —
// approximate, but keeps older entries from showing as blank/zero.
const settledAmountOf = async (doc) =>
  doc.amount_settled != null ? doc.amount_settled : (await inrToGbpPence(doc.amount)) / 100;

// @desc Total sales - daily & monthly summary
const getSalesSummary = async (req, res) => {
  try {
    // The business operates on Pakistan time, so "today"/"this month" must
    // be measured in PKT — server-local midnight (UTC on Render) is off by
    // up to 5 hours and briefly counts all of the previous PKT day as
    // "today" too.
    const startOfDay = startOfDayPKT();
    const startOfMonth = startOfMonthPKT();

    const [dailyPayments, monthlyPayments] = await Promise.all([
      Payment.find({ status: 'completed', createdAt: { $gte: startOfDay } }),
      Payment.find({ status: 'completed', createdAt: { $gte: startOfMonth } }),
    ]);

    const sumInr = (payments) =>
      payments.reduce((total, p) => total + p.amount, 0);
    const sumSettled = async (payments) => {
      const amounts = await Promise.all(payments.map(settledAmountOf));
      return amounts.reduce((total, a) => total + a, 0);
    };

    const [daily_total_settled, monthly_total_settled] = await Promise.all([
      sumSettled(dailyPayments),
      sumSettled(monthlyPayments),
    ]);

    res.json({
      daily_total: sumInr(dailyPayments),
      monthly_total: sumInr(monthlyPayments),
      daily_total_settled,
      monthly_total_settled,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Search/track sales by category within the 30-day retained log
const getSalesByCategory = async (req, res) => {
  const { category } = req.query; // e.g. ?category=plan

  try {
    const filter = category ? { category } : {};
    const logs = await SalesLog.find(filter).sort({ date: -1 });

    const total = logs.reduce((sum, log) => sum + log.amount, 0);
    const settledAmounts = await Promise.all(logs.map(settledAmountOf));
    const total_settled = settledAmounts.reduce((sum, a) => sum + a, 0);
    const logsWithSettled = logs.map((log, i) => ({
      ...log.toObject(),
      amount_settled: settledAmounts[i],
    }));

    res.json({ total, total_settled, count: logs.length, logs: logsWithSettled });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getSalesSummary, getSalesByCategory };