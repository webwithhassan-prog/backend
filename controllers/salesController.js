const Payment = require('../models/Payment');
const SalesLog = require('../models/SalesLog');

// @desc Total sales - daily & monthly summary
const getSalesSummary = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const dailyTotal = await Payment.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: startOfDay } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const monthlyTotal = await Payment.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    res.json({
      daily_total: dailyTotal[0]?.total || 0,
      monthly_total: monthlyTotal[0]?.total || 0,
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

    res.json({ total, count: logs.length, logs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getSalesSummary, getSalesByCategory };