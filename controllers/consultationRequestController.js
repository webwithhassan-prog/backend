const ConsultationRequest = require("../models/ConsultationRequest");
const Consultation = require("../models/Consultation");

// @desc Admin — list all requests
const getRequests = async (req, res) => {
  try {
    const requests = await ConsultationRequest.find()
      .populate("client_ref", "name phone_number")
      .populate("preferred_consultant_ref", "name specialty")
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Admin — schedule a request (creates the actual Consultation and
// links it)
const scheduleRequest = async (req, res) => {
  const { consultant_ref, datetime } = req.body;

  try {
    const request = await ConsultationRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    const consultation = await Consultation.create({
      consultant_ref,
      client_ref: request.client_ref,
      datetime,
      payment_ref: request.payment_ref || undefined,
    });

    request.status = "scheduled";
    request.consultation_ref = consultation._id;
    await request.save();

    res.json({ request, consultation });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Admin — decline a request
const declineRequest = async (req, res) => {
  try {
    const request = await ConsultationRequest.findByIdAndUpdate(
      req.params.id,
      { status: "declined" },
      { new: true },
    );
    if (!request) return res.status(404).json({ message: "Request not found" });
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getRequests,
  scheduleRequest,
  declineRequest,
};
