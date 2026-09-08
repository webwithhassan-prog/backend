const Consultant = require("../models/Consultant");
const Review = require("../models/Review");

// @desc Get all consultants
const getConsultants = async (req, res) => {
  try {
    const consultants = await Consultant.find();
    res.json(consultants);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Create a consultant
const createConsultant = async (req, res) => {
  try {
    const consultant = await Consultant.create(req.body);
    res.status(201).json(consultant);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Update a consultant
const updateConsultant = async (req, res) => {
  try {
    const consultant = await Consultant.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );
    if (!consultant)
      return res.status(404).json({ message: "Consultant not found" });
    res.json(consultant);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Delete a consultant
const deleteConsultant = async (req, res) => {
  try {
    const consultant = await Consultant.findByIdAndDelete(req.params.id);
    if (!consultant)
      return res.status(404).json({ message: "Consultant not found" });
    res.json({ message: "Consultant removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// @desc Get consultants (public — limited fields only, banned ones hidden,
// each with an average rating + review count from client reviews)
const getPublicConsultants = async (req, res) => {
  try {
    const consultants = await Consultant.find({ banned: { $ne: true } }).select(
      "name specialty photo_url years_experience session_duration fee bio max_clients_per_session",
    );

    const ratings = await Review.aggregate([
      {
        $group: {
          _id: "$consultant_ref",
          avg_rating: { $avg: "$rating" },
          review_count: { $sum: 1 },
        },
      },
    ]);
    const ratingsById = Object.fromEntries(
      ratings.map((r) => [r._id.toString(), r]),
    );

    const withRatings = consultants.map((c) => {
      const r = ratingsById[c._id.toString()];
      return {
        ...c.toObject(),
        avg_rating: r ? Math.round(r.avg_rating * 10) / 10 : null,
        review_count: r ? r.review_count : 0,
      };
    });

    res.json(withRatings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Ban a consultant — hides them from the public listing
const banConsultant = async (req, res) => {
  const { reason } = req.body;
  try {
    const consultant = await Consultant.findByIdAndUpdate(
      req.params.id,
      { banned: true, ban_reason: reason || null },
      { new: true },
    );
    if (!consultant)
      return res.status(404).json({ message: "Consultant not found" });
    res.json(consultant);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Unban a consultant
const unbanConsultant = async (req, res) => {
  try {
    const consultant = await Consultant.findByIdAndUpdate(
      req.params.id,
      { banned: false, ban_reason: null },
      { new: true },
    );
    if (!consultant)
      return res.status(404).json({ message: "Consultant not found" });
    res.json(consultant);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getConsultants,
  createConsultant,
  getPublicConsultants,
  updateConsultant,
  deleteConsultant,
  banConsultant,
  unbanConsultant,
};
