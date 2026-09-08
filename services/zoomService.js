const axios = require("axios");

let cachedToken = null;
let tokenExpiry = null;

const getZoomAccessToken = async () => {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const auth = Buffer.from(
    `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`,
  ).toString("base64");

  const response = await axios.post(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${process.env.ZOOM_ACCOUNT_ID}`,
    {},
    { headers: { Authorization: `Basic ${auth}` } },
  );

  cachedToken = response.data.access_token;
  tokenExpiry = Date.now() + response.data.expires_in * 1000 - 60000;

  return cachedToken;
};

const createZoomMeeting = async ({ topic, startTime, duration = 60 }) => {
  const token = await getZoomAccessToken();

  const response = await axios.post(
    "https://api.zoom.us/v2/users/me/meetings",
    {
      topic,
      type: 2,
      start_time: startTime,
      duration,
      settings: { join_before_host: false, waiting_room: true },
    },
    { headers: { Authorization: `Bearer ${token}` } },
  );

  return {
    meeting_id: response.data.id,
    join_url: response.data.join_url,
  };
};

// One persistent link per Daily Time Slot, reused for every day's generated
// class until it's rotated (weekly) — type 3 is Zoom's "recurring meeting,
// no fixed time," which stays joinable indefinitely rather than expiring
// after one scheduled occurrence. Same join_before_host/waiting_room
// behavior as the one-off meetings above: someone still needs to start it
// from the Zoom account itself, matching the existing process.
const createRecurringMeeting = async ({ topic }) => {
  const token = await getZoomAccessToken();

  const response = await axios.post(
    "https://api.zoom.us/v2/users/me/meetings",
    {
      topic,
      type: 3,
      settings: { join_before_host: false, waiting_room: true },
    },
    { headers: { Authorization: `Bearer ${token}` } },
  );

  return {
    meeting_id: response.data.id,
    join_url: response.data.join_url,
  };
};

// Deletes a meeting outright (used when rotating a slot's link) so a
// leaked or forwarded old link actually stops working, rather than just
// being superseded by a new one.
const deleteZoomMeeting = async (meetingId) => {
  const token = await getZoomAccessToken();
  await axios.delete(`https://api.zoom.us/v2/meetings/${meetingId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

module.exports = { createZoomMeeting, createRecurringMeeting, deleteZoomMeeting };
