const Offer = require("../models/Offer");

// Offers switched on and inside their time window right now.
const liveOfferFilter = (now = new Date()) => ({
  active: true,
  $and: [
    { $or: [{ starts_at: null }, { starts_at: { $lte: now } }] },
    { $or: [{ ends_at: null }, { ends_at: { $gt: now } }] },
  ],
});

// The best live offer for a plan's product_type: { percent, endsAt }.
// endsAt lets the website drop the discount the moment a limited-time
// offer ends, even from a page loaded before.
const getActiveOffer = async (productType) => {
  const offers = await Offer.find({ ...liveOfferFilter(), discount_percent: { $gt: 0 } });
  const applicable = offers.filter(
    (o) => o.applies_to === "all" || o.applies_to === productType,
  );
  if (applicable.length === 0) return { percent: 0, endsAt: null };
  const best = applicable.reduce((a, b) => (b.discount_percent > a.discount_percent ? b : a));
  return { percent: best.discount_percent, endsAt: best.ends_at || null };
};

// Returns the discount percent (0-100) currently applicable to a plan's
// product_type. If more than one live offer applies, the best one wins.
const getActiveDiscountPercent = async (productType) =>
  (await getActiveOffer(productType)).percent;

const applyDiscount = (price, discountPercent) =>
  discountPercent > 0
    ? Math.round(price * (1 - discountPercent / 100))
    : price;

module.exports = { getActiveDiscountPercent, getActiveOffer, applyDiscount, liveOfferFilter };
