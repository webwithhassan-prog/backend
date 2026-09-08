const TimeSlot = require("../models/TimeSlot");
const {
  createRecurringMeeting,
  deleteZoomMeeting,
} = require("../services/zoomService");

const ROTATION_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

// Creates (or rotates) the persistent Zoom link for one time slot. Rotating
// deletes the old meeting outright first, so a link that was forwarded
// beyond its intended audience actually stops working instead of just
// being superseded by a new one nobody knows to switch to.
const rotateSlotZoomLink = async (slot) => {
  if (slot.zoom_meeting_id) {
    try {
      await deleteZoomMeeting(slot.zoom_meeting_id);
    } catch (err) {
      // Already-deleted or unreachable — proceed to create the replacement
      // regardless, since leaving the slot without any link is worse.
      console.error(
        `Could not delete old Zoom meeting for slot ${slot._id}:`,
        err.message,
      );
    }
  }

  const trainerName = slot.trainer_ref?.name || "Class";
  const { meeting_id, join_url } = await createRecurringMeeting({
    topic: `Fitness Zone — ${trainerName}`,
  });

  slot.zoom_meeting_id = meeting_id;
  slot.zoom_join_url = join_url;
  slot.zoom_rotated_at = new Date();
  await slot.save();
  return slot;
};

// Rotates every slot that either never got a link yet or is past its
// 7-day rotation window. Safe to call as often as needed — slots not due
// are skipped, so a daily check naturally rotates each one roughly weekly.
const rotateDueZoomLinks = async () => {
  const slots = await TimeSlot.find().populate("trainer_ref", "name");
  let rotated = 0;

  for (const slot of slots) {
    const due =
      !slot.zoom_join_url ||
      !slot.zoom_rotated_at ||
      Date.now() - slot.zoom_rotated_at.getTime() >= ROTATION_INTERVAL_MS;
    if (!due) continue;

    try {
      await rotateSlotZoomLink(slot);
      rotated++;
    } catch (err) {
      console.error(
        `Zoom link rotation failed for slot ${slot._id}:`,
        err.message,
      );
    }
  }

  return rotated;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const startZoomRotationScheduler = () => {
  const run = () => {
    rotateDueZoomLinks()
      .then((n) => {
        if (n > 0) console.log(`Zoom links rotated for ${n} time slot(s)`);
      })
      .catch((err) =>
        console.error("Zoom rotation scheduler error:", err.message),
      );
  };

  run();
  setInterval(run, ONE_DAY_MS);
};

module.exports = {
  rotateSlotZoomLink,
  rotateDueZoomLinks,
  startZoomRotationScheduler,
};
