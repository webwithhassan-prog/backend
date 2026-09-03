const DayPlan = require("../models/DayPlan");
const TimeSlot = require("../models/TimeSlot");
const Class = require("../models/Class");

// @desc Regenerate the next 7 days of Class documents from DayPlan + TimeSlot patterns.
// Updates existing classes in place (matched by trainer + exact datetime) so bookings/Zoom
// links aren't lost — only creates new ones for days/slots that don't exist yet.
const regenerateSchedule = async (req, res) => {
  try {
    const dayPlans = await DayPlan.find();
    const timeSlots = await TimeSlot.find();

    if (dayPlans.length === 0 || timeSlots.length === 0) {
      return res.status(400).json({
        message:
          "Set up your Weekly Plan and Daily Time Slots before regenerating.",
      });
    }

    const dayPlanMap = {};
    dayPlans.forEach((p) => (dayPlanMap[p.day_of_week] = p.type));

    const today = new Date();
    let created = 0;
    let updated = 0;

    for (let i = 0; i < 7; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + i);
      const dayOfWeek = targetDate.getDay();
      const type = dayPlanMap[dayOfWeek];
      if (!type) continue; // no plan set for this day

      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();
      const day = targetDate.getDate();

      for (const slot of timeSlots) {
        const datetime = new Date(year, month, day, slot.hour, slot.minute);

        const existing = await Class.findOne({
          trainer_ref: slot.trainer_ref,
          datetime,
        });

        if (existing) {
          if (existing.type !== type) {
            existing.type = type;
            await existing.save();
            updated++;
          }
        } else {
          await Class.create({
            trainer_ref: slot.trainer_ref,
            type,
            datetime,
          });
          created++;
        }
      }
    }

    res.json({ message: "Schedule regenerated", created, updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { regenerateSchedule };
