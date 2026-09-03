const DayPlan = require('../models/DayPlan');

// @desc Get all day plans (public — used by Timetable regeneration and admin)
const getDayPlans = async (req, res) => {
  try {
    const plans = await DayPlan.find().sort({ day_of_week: 1 });
    res.json(plans);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Set/update the type for a specific day of week (upsert)
const setDayPlan = async (req, res) => {
  const { day_of_week } = req.params;
  const { type } = req.body;

  try {
    const plan = await DayPlan.findOneAndUpdate(
      { day_of_week: Number(day_of_week) },
      { type },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(plan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getDayPlans, setDayPlan };