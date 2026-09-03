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

module.exports = { createZoomMeeting };
