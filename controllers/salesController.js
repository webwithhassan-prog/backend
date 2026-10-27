const Payment = require('../models/Payment');
const { inrToGbpPence } = require('../utils/currency');
const { startOfDayPKT, startOfMonthPKT, toPKTParts, pktToDate } = require('../utils/pktTime');

// Sales are website (Stripe) payments only. Manual bank/wallet payments are
// verified by hand and paid in the client's own currency — they used to be
// mixed in with their rupee base price counted as pounds (a Rs 1,300 base
// price showed as £1,300 in the totals).
const WEBSITE_SALE = { status: 'completed', gateway: { $ne: 'manual' } };

// For records predating the amount_settled field (or any edge case where it
// wasn't set), fall back to converting the INR amount at today's rate —
// approximate, but keeps older entries from showing as blank/zero.
const settledAmountOf = async (doc) =>
  doc.amount_settled != null ? doc.amount_settled : (await inrToGbpPence(doc.amount)) / 100;

const categoryOf = (p) =>
  p.plan_ref ? 'package' : p.ebook_ref ? 'ebook' : p.course_ref ? 'course' : 'custom';

const CATEGORY_FILTERS = {
  package: { plan_ref: { $ne: null } },
  plan: { plan_ref: { $ne: null } },
  ebook: { ebook_ref: { $ne: null } },
  course: { course_ref: { $ne: null } },
  custom: { plan_ref: null, ebook_ref: null, course_ref: null },
};

// "YYYY-MM" for a PKT month.
const monthKey = (year, monthIndex) => `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

// @desc Total sales - today & this month (Pakistan time), website payments only
const getSalesSummary = async (req, res) => {
  try {
    // The business operates on Pakistan time, so "today"/"this month" must
    // be measured in PKT — server-local midnight (UTC on Render) is off by
    // up to 5 hours and briefly counts all of the previous PKT day as
    // "today" too.
    const startOfDay = startOfDayPKT();
    const startOfMonth = startOfMonthPKT();

    const [dailyPayments, monthlyPayments] = await Promise.all([
      Payment.find({ ...WEBSITE_SALE, createdAt: { $gte: startOfDay } }),
      Payment.find({ ...WEBSITE_SALE, createdAt: { $gte: startOfMonth } }),
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

// @desc Website sales for one calendar month (PKT), optionally one category.
// ?month=YYYY-MM (default: this month) &category=package|ebook|course|custom
// Read from the payments themselves, which are kept permanently — the old
// sales log deleted entries after 30 days.
const getSalesByCategory = async (req, res) => {
  try {
    const now = toPKTParts();
    const match = /^(\d{4})-(\d{2})$/.exec(req.query.month || '');
    const year = match ? Number(match[1]) : now.year;
    const monthIndex = match ? Number(match[2]) - 1 : now.month;
    if (monthIndex < 0 || monthIndex > 11) {
      return res.status(400).json({ message: 'Month must be YYYY-MM.' });
    }
    const start = pktToDate(year, monthIndex, 1);
    const end = pktToDate(year, monthIndex + 1, 1);

    const categoryFilter = CATEGORY_FILTERS[req.query.category] || {};
    const [payments, first] = await Promise.all([
      Payment.find({ ...WEBSITE_SALE, ...categoryFilter, createdAt: { $gte: start, $lt: end } })
        .sort({ createdAt: -1 })
        .lean(),
      Payment.findOne(WEBSITE_SALE).sort({ createdAt: 1 }).select('createdAt').lean(),
    ]);

    const settledAmounts = await Promise.all(payments.map(settledAmountOf));
    const logs = payments.map((p, i) => ({
      _id: p._id,
      date: p.createdAt,
      category: categoryOf(p),
      amount: p.amount,
      amount_settled: settledAmounts[i],
      currency_code: p.currency_code,
      amount_display: p.amount_display,
      invoice_number: p.invoice_number || null,
    }));

    // Every month from the first website sale to this one, newest first.
    const months = [];
    const from = first ? toPKTParts(first.createdAt) : now;
    for (let y = now.year, m = now.month; y > from.year || (y === from.year && m >= from.month); ) {
      months.push(monthKey(y, m));
      m -= 1;
      if (m < 0) { m = 11; y -= 1; }
    }

    res.json({
      month: monthKey(year, monthIndex),
      months,
      total: logs.reduce((sum, l) => sum + l.amount, 0),
      total_settled: settledAmounts.reduce((sum, a) => sum + a, 0),
      count: logs.length,
      logs,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getSalesSummary, getSalesByCategory };
