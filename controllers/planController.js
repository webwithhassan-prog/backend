const Plan = require("../models/Plan");
const { getActiveDiscountPercent, applyDiscount } = require("../utils/offerDiscount");

// @desc Get all plans (public) — each plan includes any currently active
// discount so the pricing page can show it without a second request
const getPublicPlans = async (req, res) => {
  try {
    const plans = await Plan.find();
    const withDiscounts = await Promise.all(
      plans.map(async (plan) => {
        const discount_percent = await getActiveDiscountPercent(
          plan.product_type,
        );
        return {
          ...plan.toObject(),
          discount_percent,
          discounted_price: applyDiscount(plan.price, discount_percent),
        };
      }),
    );
    res.json(withDiscounts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Get all plans (admin)
const getPlans = async (req, res) => {
  try {
    const plans = await Plan.find();
    res.json(plans);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const TYPE_LABELS = {
  dietplan: "Customized Dietplan",
  workout: "Home Workouts",
  combo: "Both Combined",
};

// The packages page shows one card per type + duration, so a second plan
// with the same pair would never be reachable — refuse it up front.
const findDuplicate = (product_type, duration_days, excludeId) =>
  Plan.findOne({
    product_type,
    duration_days: Number(duration_days),
    ...(excludeId && { _id: { $ne: excludeId } }),
  });

const duplicateMessage = (product_type, duration_days) =>
  `A ${TYPE_LABELS[product_type] || product_type} package for ${duration_days} days already exists — edit that one instead.`;

const sendPlanError = (res, err) => {
  if (err.name === "ValidationError" || err.name === "CastError") {
    const first = err.errors ? Object.values(err.errors)[0] : null;
    return res.status(400).json({ message: first?.message || err.message });
  }
  res.status(500).json({ message: err.message });
};

// @desc Create a plan
const createPlan = async (req, res) => {
  try {
    const { product_type, duration_days } = req.body;
    if (await findDuplicate(product_type, duration_days)) {
      return res
        .status(400)
        .json({ message: duplicateMessage(product_type, duration_days) });
    }
    const plan = await Plan.create(req.body);
    res.status(201).json(plan);
  } catch (err) {
    sendPlanError(res, err);
  }
};

// @desc Update a plan
const updatePlan = async (req, res) => {
  try {
    const existing = await Plan.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Plan not found" });

    const product_type = req.body.product_type ?? existing.product_type;
    const duration_days = req.body.duration_days ?? existing.duration_days;
    if (await findDuplicate(product_type, duration_days, existing._id)) {
      return res
        .status(400)
        .json({ message: duplicateMessage(product_type, duration_days) });
    }

    const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.json(plan);
  } catch (err) {
    sendPlanError(res, err);
  }
};

// @desc Delete a plan
const deletePlan = async (req, res) => {
  try {
    const plan = await Plan.findByIdAndDelete(req.params.id);
    if (!plan) return res.status(404).json({ message: "Plan not found" });
    res.json({ message: "Plan removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getPublicPlans,
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
};
