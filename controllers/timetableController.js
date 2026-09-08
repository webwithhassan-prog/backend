const DayPlan = require("../models/DayPlan");
const TimeSlot = require("../models/TimeSlot");
const Class = require("../models/Class");

// Core regeneration logic, shared by the manual admin trigger and the
// daily auto-regeneration scheduler. Regenerates the next 7 days of Class
// documents from DayPlan + TimeSlot patterns. Updates existing classes in
// place (matched by trainer + exact datetime) so bookings/Zoom links
// aren't lost — only creates new ones for days/slots that don't exist yet.
const runRegeneration = async () => {
  const dayPlans = await DayPlan.find();
  const timeSlots = await TimeSlot.find();

  if (dayPlans.length === 0 || timeSlots.length === 0) {
    return {
      created: 0,
      updated: 0,
      message: "Set up your Weekly Plan and Daily Time Slots before regenerating.",
    };
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

  // Purge stale/orphaned future classes — leftover from a time slot that
  // was since edited or deleted, but whose old generated occurrences never
  // got cleaned up. Only touches today onward; past history is untouched.
  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);

  const validKeys = new Set(
    timeSlots.map((s) => `${s.trainer_ref}-${s.hour}-${s.minute}`),
  );

  const futureClasses = await Class.find({ datetime: { $gte: startOfToday } });
  const staleIds = futureClasses
    .filter((c) => {
      const d = new Date(c.datetime);
      const key = `${c.trainer_ref}-${d.getHours()}-${d.getMinutes()}`;
      return !validKeys.has(key);
    })
    .map((c) => c._id);

  let removed = 0;
  if (staleIds.length > 0) {
    const result = await Class.deleteMany({ _id: { $in: staleIds } });
    removed = result.deletedCount;
  }

  return { created, updated, removed, message: "Schedule regenerated" };
};

// @desc Regenerate the schedule now (admin-triggered)
const regenerateSchedule = async (req, res) => {
  try {
    const result = await runRegeneration();
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { regenerateSchedule, runRegeneration };
