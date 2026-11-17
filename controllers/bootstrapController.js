const { getSettings } = require("./settingsController");
const { getActiveOffers } = require("./offerController");
const { getPublicPlans } = require("./planController");
const { getHeroBanners } = require("./heroBannerController");
const { getTestimonials } = require("./testimonialController");
const { getPublicReviews } = require("./reviewController");
const { getDemoVideos } = require("./demoVideoController");
const { getRecentActivity } = require("./dailyLogController");
const { getPublicMethodsForCountry } = require("./manualPaymentMethodController");
const { detectLocalCurrency, getRates } = require("./currencyController");
const { onCacheClear } = require("../middleware/responseCache");

// Runs an existing route handler and resolves with what it would have sent,
// so the bundle below returns exactly what each separate endpoint returns.
const capture = (handler, req) =>
  new Promise((resolve) => {
    let status = 200;
    const res = {
      status(code) {
        status = code;
        return res;
      },
      set() {
        return res;
      },
      json(body) {
        resolve(status === 200 ? body : undefined);
        return res;
      },
    };
    Promise.resolve(handler(req, res)).catch(() => resolve(undefined));
  });

// The same for every visitor: the admin-managed content plus exchange rates.
const SHARED_TTL_MS = 5 * 60 * 1000;
let shared = null; // { body, expires }
onCacheClear(() => {
  shared = null;
});

const loadShared = async (req) => {
  if (shared && shared.expires > Date.now()) return shared.body;
  const [settings, offers, plans, heroBanners, testimonials, reviews, demoVideos, recentActivity, rates] =
    await Promise.all([
      capture(getSettings, req),
      capture(getActiveOffers, req),
      capture(getPublicPlans, req),
      capture(getHeroBanners, req),
      capture(getTestimonials, req),
      capture(getPublicReviews, req),
      capture(getDemoVideos, req),
      capture(getRecentActivity, req),
      capture(getRates, req),
    ]);
  const body = { settings, offers, plans, heroBanners, testimonials, reviews, demoVideos, recentActivity, rates };
  // Only keep a complete set; a part that failed is fetched again next time.
  if (Object.values(body).every((v) => v !== undefined)) {
    shared = { body, expires: Date.now() + SHARED_TTL_MS };
  }
  return body;
};

// @desc Public — everything a first page view needs, in one request.
// From far-away visitors each request costs a connection setup plus a round
// trip (about half a second from Pakistan to the server in India); a first
// visit used to make 12 of them, plus a 13th for local payment methods that
// had to wait for the country to be detected. The website answers its first
// requests for these from this bundle (frontend services/api.js).
const getBootstrap = async (req, res) => {
  const [base, detect] = await Promise.all([loadShared(req), capture(detectLocalCurrency, req)]);

  const country = detect?.country_code;
  const paymentMethods = country
    ? await capture(getPublicMethodsForCountry, { ...req, query: { country } })
    : undefined;

  // Per visitor (the detected country), so only their own browser may reuse it.
  res.set("Cache-Control", "private, max-age=60");
  res.json({ ...base, detect, paymentMethods: paymentMethods && { country, methods: paymentMethods } });
};

module.exports = { getBootstrap };
