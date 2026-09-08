const DayPlan = require("../models/DayPlan");
const TimeSlot = require("../models/TimeSlot");
const Class = require("../models/Class");
const { PKT_OFFSET_HOURS, pktToDate, toPKTParts } = require("../utils/pktTime");

// TimeSlot.hour/minute are entered by the admin as Pakistan time — see the
// "Time is in Pakistan time" hint on the admin form. `new Date(year,
// month, day, hour, minute)` used to build the date in the SERVER's local
// timezone instead (UTC on Render), silently storing every class 5 hours
// later than intended. pktToDate builds the correct absolute instant
// regardless of what timezone the server process runs in.

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
  // correct one.
  const todayParts = toPKTParts();
  const startOfToday = pktToDate(todayParts.year, todayParts.month, todayParts.day);
  let created = 0;
  let updated = 0;

  for (let i = 0; i < 7; i++) {
    const targetPKT = new Date(startOfToday.getTime() + i * 24 * 60 * 60 * 1000);
    const { year, month, day, dayOfWeek } = toPKTParts(targetPKT);
    const type = dayPlanMap[dayOfWeek];
    if (!type) continue; // no plan set for this day

    for (const slot of timeSlots) {
      const datetime = pktToDate(year, month, day, slot.hour, slot.minute);

      const existing = await Class.findOne({
        trainer_ref: slot.trainer_ref,
        datetime,
      });

      if (existing) {
        // Keep the class's zoom link in sync with its slot's current one —
        // this is how a weekly rotation actually reaches classes that were
        // already generated before the rotation happened.
        const zoomChanged =
          existing.zoom_meeting_id !== slot.zoom_meeting_id ||
          existing.zoom_join_url !== slot.zoom_join_url;
        if (existing.type !== type || zoomChanged) {
          existing.type = type;
          existing.zoom_meeting_id = slot.zoom_meeting_id;
          existing.zoom_join_url = slot.zoom_join_url;
          await existing.save();
          updated++;
        }
      } else {
        await Class.create({
          trainer_ref: slot.trainer_ref,
          type,
          datetime,
          zoom_meeting_id: slot.zoom_meeting_id,
          zoom_join_url: slot.zoom_join_url,
        });
        created++;
      }
    }
  }

  // Purge stale/orphaned future classes — leftover from a time slot that
  // was since edited or deleted, but whose old generated occurrences never
  // got cleaned up. Only touches today onward; past history is untouched.
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
