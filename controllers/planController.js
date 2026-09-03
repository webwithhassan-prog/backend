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

// @desc Create a plan
const createPlan = async (req, res) => {
  try {
    const plan = await Plan.create(req.body);
    res.status(201).json(plan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Update a plan
const updatePlan = async (req, res) => {
  try {
    const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!plan) return res.status(404).json({ message: "Plan not found" });
    res.json(plan);
  } catch (err) {
    res.status(500).json({ message: err.message });
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
