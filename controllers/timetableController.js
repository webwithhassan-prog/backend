const DayPlan = require("../models/DayPlan");
const TimeSlot = require("../models/TimeSlot");
const Class = require("../models/Class");

// TimeSlot.hour/minute are entered by the admin as Pakistan time (PKT,
// UTC+5, no DST) — see the "Time is in Pakistan time" hint on the admin
// form. `new Date(year, month, day, hour, minute)` builds the date in the
// SERVER's local timezone instead (UTC on Render), silently storing every
// class 5 hours later than intended. Building the instant via Date.UTC
// with the offset subtracted stores the correct absolute moment regardless
// of what timezone the server process runs in.
const PKT_OFFSET_HOURS = 5;
const pktSlotToDate = (year, month, day, hour, minute) =>
  new Date(Date.UTC(year, month, day, hour - PKT_OFFSET_HOURS, minute));

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

  // "Today" and its day-of-week must be read in PKT too — otherwise the
  // roughly 5-hour window around the PKT day boundary (19:00-23:59 UTC)
  // picks yesterday's or tomorrow's weekly-plan type instead of the
  // correct one. Shifting the instant into PKT before reading calendar
  // fields (via the UTC getters) keeps this correct regardless of the
  // server process's own timezone.
  const today = new Date();
  const todayPKT = new Date(today.getTime() + PKT_OFFSET_HOURS * 60 * 60 * 1000);
  let created = 0;
  let updated = 0;

  for (let i = 0; i < 7; i++) {
    const targetPKT = new Date(todayPKT);
    targetPKT.setUTCDate(targetPKT.getUTCDate() + i);
    const dayOfWeek = targetPKT.getUTCDay();
    const type = dayPlanMap[dayOfWeek];
    if (!type) continue; // no plan set for this day

    const year = targetPKT.getUTCFullYear();
    const month = targetPKT.getUTCMonth();
    const day = targetPKT.getUTCDate();

    for (const slot of timeSlots) {
      const datetime = pktSlotToDate(year, month, day, slot.hour, slot.minute);

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
  const startOfToday = pktSlotToDate(
    todayPKT.getUTCFullYear(),
    todayPKT.getUTCMonth(),
    todayPKT.getUTCDate(),
    0,
    0,
  );

  const validKeys = new Set(
    timeSlots.map((s) => `${s.trainer_ref}-${s.hour}-${s.minute}`),
  );

  const futureClasses = await Class.find({ datetime: { $gte: startOfToday } });
  const staleIds = futureClasses
    .filter((c) => {
      const d = new Date(c.datetime);
      // Reverse the same PKT offset used when the class was created, so
      // this recovers the admin-entered slot hour/minute regardless of
      // the server process's own timezone.
      const pktHour = (d.getUTCHours() + PKT_OFFSET_HOURS) % 24;
      const key = `${c.trainer_ref}-${pktHour}-${d.getUTCMinutes()}`;
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
