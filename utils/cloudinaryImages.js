const crypto = require("crypto");
const axios = require("axios");

// Uploads happen unsigned, straight from the frontend (see the various
// admin pages) — this cloud name matches those. Deletion needs a signed
// Admin API call instead, so it needs the account's API key/secret, which
// only exist server-side.
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "zyfxigcj";

const extractPublicId = (url) => {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+(?:\?.*)?$/);
  return match ? match[1] : null;
};

// Best-effort — payment slips only need to exist long enough for an admin
// to cross-check them; a failed delete should never block confirming or
// rejecting the payment itself, same spirit as every other best-effort
// side-effect in this codebase (see notifyAdmin in manualPaymentController).
const deleteCloudinaryImage = async (url) => {
  if (!url) return;
  if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error("Cloudinary API credentials not set — skipping slip deletion");
    return;
  }
  try {
    const publicId = extractPublicId(url);
    if (!publicId) return;

    const timestamp = Math.floor(Date.now() / 1000);
    const toSign = `public_id=${publicId}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`;
    const signature = crypto.createHash("sha1").update(toSign).digest("hex");

    await axios.post(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`, {
      public_id: publicId,
      timestamp,
      api_key: process.env.CLOUDINARY_API_KEY,
      signature,
    });
  } catch (err) {
    console.error("Failed to delete Cloudinary image:", err.message);
  }
};

module.exports = { deleteCloudinaryImage };
