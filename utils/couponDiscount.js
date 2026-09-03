const Coupon = require("../models/Coupon");

const getCoupon = async (code) => {
  if (!code) return null;
  return Coupon.findOne({ code: code.trim().toUpperCase() });
};

// Returns an error message if the coupon can't be used right now, else null.
const validateCoupon = (coupon) => {
  if (!coupon) return "Invalid coupon code";
  if (!coupon.active) return "This coupon is no longer active";
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date())
    return "This coupon has expired";
  if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses)
    return "This coupon has reached its usage limit";
  return null;
};

const couponAppliesToType = (coupon, productType) =>
  coupon.applies_to === "all" || coupon.applies_to === productType;

module.exports = { getCoupon, validateCoupon, couponAppliesToType };
