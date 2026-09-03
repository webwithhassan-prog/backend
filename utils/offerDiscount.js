const Offer = require("../models/Offer");

// Returns the discount percent (0-100) currently applicable to a plan's
// product_type. If more than one active offer applies, the best one wins.
const getActiveDiscountPercent = async (productType) => {
  const offers = await Offer.find({
    active: true,
    discount_percent: { $gt: 0 },
  });
  const applicable = offers.filter(
    (o) => o.applies_to === "all" || o.applies_to === productType,
  );
  if (applicable.length === 0) return 0;
  return Math.max(...applicable.map((o) => o.discount_percent));
};

const applyDiscount = (price, discountPercent) =>
  discountPercent > 0
    ? Math.round(price * (1 - discountPercent / 100))
    : price;

module.exports = { getActiveDiscountPercent, applyDiscount };
