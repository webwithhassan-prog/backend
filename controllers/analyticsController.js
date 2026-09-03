const AnalyticsEvent = require("../models/AnalyticsEvent");
const Payment = require("../models/Payment");

const eventTypes = [
  "page_view",
  "checkout_started",
  "offer_popup_view",
  "offer_popup_click",
];

// @desc Record a single analytics event (public — fired from the site itself)
const trackEvent = async (req, res) => {
  const { type, path, meta } = req.body;

  if (!eventTypes.includes(type)) {
    return res.status(400).json({ message: "Unknown event type" });
  }

  try {
    await AnalyticsEvent.create({ type, path: path || "", meta: meta || {} });
    res.status(201).json({ received: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Get an analytics summary for the admin dashboard
const getSummary = async (req, res) => {
  const days = Number(req.query.days) || 30;

  try {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [
      totalPageViews,
      topPagesAgg,
      dailyViewsAgg,
      checkoutStarted,
      checkoutCompleted,
      offerPopupViews,
      offerPopupClicks,
    ] = await Promise.all([
      AnalyticsEvent.countDocuments({
        type: "page_view",
        createdAt: { $gte: since },
      }),
      AnalyticsEvent.aggregate([
        { $match: { type: "page_view", createdAt: { $gte: since } } },
        { $group: { _id: "$path", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      AnalyticsEvent.aggregate([
        { $match: { type: "page_view", createdAt: { $gte: since } } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      AnalyticsEvent.countDocuments({
        type: "checkout_started",
        createdAt: { $gte: since },
      }),
      Payment.countDocuments({
        status: "completed",
        plan_ref: { $ne: null },
        createdAt: { $gte: since },
      }),
      AnalyticsEvent.countDocuments({
        type: "offer_popup_view",
        createdAt: { $gte: since },
      }),
      AnalyticsEvent.countDocuments({
        type: "offer_popup_click",
        createdAt: { $gte: since },
      }),
    ]);

    res.json({
      days,
      totalPageViews,
      topPages: topPagesAgg.map((p) => ({
        path: p._id || "(unknown)",
        count: p.count,
      })),
      dailyViews: dailyViewsAgg.map((d) => ({ date: d._id, count: d.count })),
      funnel: {
        checkoutStarted,
        checkoutCompleted,
      },
      offers: {
        popupViews: offerPopupViews,
        popupClicks: offerPopupClicks,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { trackEvent, getSummary };
