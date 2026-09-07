const Payment = require('../models/Payment');
const SalesLog = require('../models/SalesLog');
const { inrToUsdCents } = require('../utils/currency');

// For records predating the amount_usd field (or any edge case where it
// wasn't set), fall back to converting the INR amount at today's rate —
// approximate, but keeps older entries from showing as blank/zero.
const usdAmountOf = (doc) =>
  doc.amount_usd != null ? doc.amount_usd : inrToUsdCents(doc.amount) / 100;

// @desc Total sales - daily & monthly summary
const getSalesSummary = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [dailyPayments, monthlyPayments] = await Promise.all([
      Payment.find({ status: 'completed', createdAt: { $gte: startOfDay } }),
      Payment.find({ status: 'completed', createdAt: { $gte: startOfMonth } }),
    ]);

    const sum = (payments, field) =>
      payments.reduce((total, p) => total + (field === 'usd' ? usdAmountOf(p) : p.amount), 0);

    res.json({
      daily_total: sum(dailyPayments, 'inr'),
      monthly_total: sum(monthlyPayments, 'inr'),
      daily_total_usd: sum(dailyPayments, 'usd'),
      monthly_total_usd: sum(monthlyPayments, 'usd'),
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
    const total_usd = logs.reduce((sum, log) => sum + usdAmountOf(log), 0);
    const logsWithUsd = logs.map((log) => ({
      ...log.toObject(),
      amount_usd: usdAmountOf(log),
    }));

    res.json({ total, total_usd, count: logs.length, logs: logsWithUsd });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getSalesSummary, getSalesByCategory };