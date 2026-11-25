const DayPlan = require("../models/DayPlan");
const TimeSlot = require("../models/TimeSlot");
const Class = require("../models/Class");
const { pktToDate, toPKTParts } = require("../utils/pktTime");
const { getOrCreateSettings } = require("../utils/zoomLinkRotation");

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

  // With the admin's "use each class's own link" switch on, a class uses
  // its slot's link when it has one; otherwise (or with the switch off)
  // the shared link in Settings.
  const settings = await getOrCreateSettings();
  const ownLinks = !!settings.use_class_zoom_links;
  const linkFor = (slot) =>
    ownLinks && slot.class_zoom_url
      ? { zoomMeetingId: null, zoomJoinUrl: slot.class_zoom_url }
      : { zoomMeetingId: settings.zoom_meeting_id, zoomJoinUrl: settings.zoom_join_url };

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
      // Not every class runs every day — Sundays only have one or two.
      if (!TimeSlot.daysOf(slot).includes(dayOfWeek)) continue;
      const { zoomMeetingId, zoomJoinUrl } = linkFor(slot);
      const datetime = pktToDate(year, month, day, slot.hour, slot.minute);

      const existing = await Class.findOne({
        trainer_ref: slot.trainer_ref,
        datetime,
      });

      if (existing) {
        // Keep the class's Zoom link in sync with its slot's (or the
        // shared one) — this is how a changed link reaches classes that
        // were already generated.
        const zoomChanged =
          existing.zoom_meeting_id !== zoomMeetingId ||
          existing.zoom_join_url !== zoomJoinUrl;
        if (existing.type !== type || zoomChanged) {
          existing.type = type;
          existing.zoom_meeting_id = zoomMeetingId;
          existing.zoom_join_url = zoomJoinUrl;
          await existing.save();
          updated++;
        }
      } else {
        await Class.create({
          trainer_ref: slot.trainer_ref,
          type,
          datetime,
          zoom_meeting_id: zoomMeetingId,
          zoom_join_url: zoomJoinUrl,
        });
        created++;
      }
    }
  }

  // Purge stale/orphaned future classes — leftover from a time slot that
  // was since edited, deleted or taken off that day of the week, whose old
  // generated occurrences never got cleaned up. Only touches today onward;
  // past history is untouched.
  const validKeys = new Set(
    timeSlots.flatMap((s) =>
      TimeSlot.daysOf(s).map((d) => `${s.trainer_ref}-${s.hour}-${s.minute}-${d}`),
    ),
  );

  const futureClasses = await Class.find({ datetime: { $gte: startOfToday } });
  const staleIds = futureClasses
    .filter((c) => {
      const d = new Date(c.datetime);
      // Reverse the same PKT offset used when the class was created, so
      // this recovers the admin-entered slot hour/minute regardless of
      // the server process's own timezone.
      const { hour: pktHour, minute, dayOfWeek } = toPKTParts(d);
      const key = `${c.trainer_ref}-${pktHour}-${minute}-${dayOfWeek}`;
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

// How many classes have their own link saved, for the admin switch.
const linkCounts = async () => {
  const [total, withOwn] = await Promise.all([
    TimeSlot.countDocuments(),
    TimeSlot.countDocuments({ class_zoom_url: { $nin: [null, ""] } }),
  ]);
  return { slots_total: total, slots_with_own_link: withOwn };
};

// @desc Admin — the shared Zoom link and the own-links switch
const getZoomLink = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.json({
      zoom_join_url: settings.zoom_join_url || null,
      zoom_rotated_at: settings.zoom_rotated_at || null,
      use_class_zoom_links: !!settings.use_class_zoom_links,
      ...(await linkCounts()),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Admin — manually set the shared Zoom link used for every class.
// Automatic Zoom-API rotation is paused (see server.js) — the admin now
// owns this link entirely; whatever they paste here is pushed onto every
// upcoming class immediately, same as the old rotation used to do.
const setZoomLink = async (req, res) => {
  const { zoom_join_url } = req.body;

  if (typeof zoom_join_url !== "string" || !zoom_join_url.trim()) {
    return res.status(400).json({ message: "Zoom link is required" });
  }

  let parsed;
  try {
    parsed = new URL(zoom_join_url.trim());
  } catch {
    return res.status(400).json({ message: "Enter a valid URL" });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return res.status(400).json({ message: "Enter a valid URL" });
  }

  try {
    const settings = await getOrCreateSettings();
    settings.zoom_join_url = parsed.toString();
    // No longer a real Zoom API meeting id — this link is admin-entered,
    // not created through Zoom's API, so there's nothing to rotate/delete
    // via that API anymore.
    settings.zoom_meeting_id = null;
    settings.zoom_rotated_at = new Date();
    await settings.save();
    await runRegeneration();
    res.json({
      zoom_join_url: settings.zoom_join_url,
      zoom_rotated_at: settings.zoom_rotated_at,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Admin — switch between every class using the shared link (off)
// and classes using their own saved links (on). Upcoming classes switch
// straight away.
const setZoomMode = async (req, res) => {
  const enabled = req.body?.use_class_zoom_links;
  if (typeof enabled !== "boolean") {
    return res.status(400).json({ message: "use_class_zoom_links must be true or false" });
  }
  try {
    const counts = await linkCounts();
    if (enabled && counts.slots_with_own_link === 0) {
      return res.status(400).json({
        message: "Add a Zoom link to at least one class first (edit a time slot).",
      });
    }
    const settings = await getOrCreateSettings();
    settings.use_class_zoom_links = enabled;
    await settings.save();
    await runRegeneration();
    res.json({ use_class_zoom_links: enabled, ...counts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  regenerateSchedule,
  runRegeneration,
  getZoomLink,
  setZoomLink,
  setZoomMode,
};
