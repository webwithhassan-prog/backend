const { getOrCreateSettings } = require("../controllers/settingsController");
const {
  createRecurringMeeting,
  deleteZoomMeeting,
} = require("../services/zoomService");

const ROTATION_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

// Creates (or rotates) the one shared Zoom link used for every class,
// regardless of trainer or time — matches the existing process of the
// admin sharing a single link with the whole trainers' group. Rotating
// deletes the old meeting outright first, so a link forwarded beyond its
// intended audience actually stops working instead of just being
// superseded by a new one nobody knows to switch to.
const rotateZoomLink = async () => {
  const settings = await getOrCreateSettings();

  if (settings.zoom_meeting_id) {
    try {
      await deleteZoomMeeting(settings.zoom_meeting_id);
    } catch (err) {
      console.error("Could not delete old Zoom meeting:", err.message);
    }
  }

  const { meeting_id, join_url } = await createRecurringMeeting({
    topic: "Fitness Zone — Live Class",
  });

  settings.zoom_meeting_id = meeting_id;
  settings.zoom_join_url = join_url;
  settings.zoom_rotated_at = new Date();
  await settings.save();
  return settings;
};

// Rotates the shared link if it's never been created or is past its 7-day
// window. Safe to call as often as needed — returns false when nothing
// was due, so a daily check naturally rotates it roughly weekly.
const rotateZoomLinkIfDue = async () => {
  const settings = await getOrCreateSettings();
  const due =
    !settings.zoom_join_url ||
    !settings.zoom_rotated_at ||
    Date.now() - settings.zoom_rotated_at.getTime() >= ROTATION_INTERVAL_MS;
  if (!due) return false;

  await rotateZoomLink();
  return true;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const startZoomRotationScheduler = () => {
  const run = () => {
    rotateZoomLinkIfDue()
      .then((rotated) => {
        if (rotated) console.log("Zoom link rotated");
      })
      .catch((err) =>
        console.error("Zoom rotation scheduler error:", err.message),
      );
  };

  run();
  setInterval(run, ONE_DAY_MS);
};

module.exports = {
  getOrCreateSettings,
  rotateZoomLink,
  rotateZoomLinkIfDue,
  startZoomRotationScheduler,
};
