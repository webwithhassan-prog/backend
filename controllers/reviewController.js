const Review = require("../models/Review");
const Client = require("../models/Client");

const clean = (value, max) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";

// "Amna Khan" -> "Amna K." — the default public name, so a full name is
// never published unless the client types it themselves.
const shortName = (fullName = "") => {
  const [first, ...rest] = fullName.trim().split(/\s+/);
  if (!first) return "Fitness Zone member";
  const last = rest.pop();
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
};

const clientFor = (req) =>
  Client.findOne({ user_ref: req.user._id }).select("_id name");

// @desc The logged-in client's own review (or null)
const getMyReview = async (req, res) => {
  try {
    const client = await clientFor(req);
    if (!client) return res.status(404).json({ message: "Client not found" });
    const review = await Review.findOne({ client_ref: client._id });
    res.json({ review, suggested_name: shortName(client.name) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Write or update the logged-in client's review. Any change goes back
// to "pending" so an admin approves what's actually published.
const saveMyReview = async (req, res) => {
  try {
    const rating = Number(req.body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Choose a rating from 1 to 5 stars." });
    }
    const text = clean(req.body.text, 1000);
    if (text.length < 10) {
      return res
        .status(400)
        .json({ message: "Write a few words about your experience (at least 10 characters)." });
    }

    const client = await clientFor(req);
    if (!client) return res.status(404).json({ message: "Client not found" });

    const display_name = clean(req.body.display_name, 60) || shortName(client.name);
    const review = await Review.findOneAndUpdate(
      { client_ref: client._id },
      { rating, text, display_name, status: "pending" },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
    );
    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Approved reviews, newest first (public)
const getPublicReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ status: "approved" })
      .sort({ updatedAt: -1 })
      .limit(60)
      .select("display_name rating text updatedAt")
      .lean();
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Every review, pending first (admin)
const getReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .sort({ status: 1, updatedAt: -1 })
      .limit(300)
      .populate("client_ref", "name phone_number")
      .lean();
    // "approved" < "pending" < "rejected" alphabetically; put pending first.
    const order = { pending: 0, approved: 1, rejected: 2 };
    reviews.sort((a, b) => order[a.status] - order[b.status]);
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Approve / reject / reset a review (admin)
const updateReviewStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be pending, approved or rejected." });
    }
    const review = await Review.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!review) return res.status(404).json({ message: "Review not found" });
    res.json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Delete a review (admin)
const deleteReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });
    res.json({ message: "Review deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getMyReview,
  saveMyReview,
  getPublicReviews,
  getReviews,
  updateReviewStatus,
  deleteReview,
  shortName,
};
