const Coupon = require("../models/Coupon");
const Plan = require("../models/Plan");
const {
  getCoupon,
  validateCoupon,
  couponAppliesToType,
} = require("../utils/couponDiscount");
const { getActiveDiscountPercent, applyDiscount } = require("../utils/offerDiscount");

// @desc Validate a coupon code against a set of plans (public — checkout preview,
// never trusted as the actual charged amount, checkout recomputes this from scratch)
const validateCouponCode = async (req, res) => {
  const { code, plan_ids } = req.body;

  try {
    const coupon = await getCoupon(code);
    const error = validateCoupon(coupon);
    if (error) return res.status(400).json({ valid: false, message: error });

    const plans = await Plan.find({ _id: { $in: plan_ids || [] } });
    if (plans.length === 0) {
      return res.status(400).json({
        valid: false,
        message: "No packages to apply this coupon to",
      });
    }

    const applicable = plans.some((p) => couponAppliesToType(coupon, p.product_type));
    if (!applicable) {
      return res.status(400).json({
        valid: false,
        message: `This coupon only applies to ${coupon.applies_to} packages`,
      });
    }

    let originalTotal = 0;
    let discountedTotal = 0;
    for (const plan of plans) {
      const offerPercent = await getActiveDiscountPercent(plan.product_type);
      const couponPercent = couponAppliesToType(coupon, plan.product_type)
        ? coupon.discount_percent
        : 0;
      const bestPercent = Math.max(offerPercent, couponPercent);
      originalTotal += plan.price;
      discountedTotal += applyDiscount(plan.price, bestPercent);
    }

    res.json({
      valid: true,
      message: `Coupon applied — ${coupon.discount_percent}% off`,
      discount_percent: coupon.discount_percent,
      applies_to: coupon.applies_to,
      original_total: originalTotal,
      discounted_total: discountedTotal,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Get all coupons (admin)
const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Create a coupon
const createCoupon = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (payload.code) payload.code = payload.code.trim().toUpperCase();
    const coupon = await Coupon.create(payload);
    res.status(201).json(coupon);
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ message: "A coupon with this code already exists" });
    }
    res.status(500).json({ message: err.message });
  }
};

// @desc Update a coupon (edit terms, or toggle active)
const updateCoupon = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (payload.code) payload.code = payload.code.trim().toUpperCase();
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });
    if (!coupon) return res.status(404).json({ message: "Coupon not found" });
    res.json(coupon);
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ message: "A coupon with this code already exists" });
    }
    res.status(500).json({ message: err.message });
  }
};

// @desc Delete a coupon
const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ message: "Coupon not found" });
    res.json({ message: "Coupon deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  validateCouponCode,
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
};
