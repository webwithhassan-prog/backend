const ConsultationRequest = require("../models/ConsultationRequest");
const Consultation = require("../models/Consultation");
const Client = require("../models/Client");

// @desc Client submits a consultation request
const createRequest = async (req, res) => {
  const { client_id, specialty, consultant_id, preferred_time } = req.body;

  try {
    const client = await Client.findById(client_id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    if (!client.has_premium) {
      return res.status(403).json({ message: "Premium package is not active" });
    }

    if (client.premium_sessions_used >= client.premium_sessions_total) {
      return res.status(403).json({
        message:
          "You\u2019ve used all your included Premium sessions. Purchase Premium again to get more.",
      });
    }

    const request = await ConsultationRequest.create({
      client_ref: client_id,
      specialty,
      preferred_consultant_ref: consultant_id || null,
      preferred_time,
    });
    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Client — get their own requests
const getMyRequests = async (req, res) => {
  const { client_id } = req.query;

  try {
    const requests = await ConsultationRequest.find({
      client_ref: client_id,
    }).sort({
      createdAt: -1,
    });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

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

// @desc Admin — schedule a request (creates the actual Consultation, deducts one
// premium session from the client's quota, and links it)
const scheduleRequest = async (req, res) => {
  const { consultant_ref, datetime } = req.body;

  try {
    const request = await ConsultationRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    const client = await Client.findById(request.client_ref);
    if (!client) return res.status(404).json({ message: "Client not found" });

    if (
      !request.paid &&
      client.premium_sessions_used >= client.premium_sessions_total
    ) {
      return res.status(403).json({
        message: "This client has no remaining Premium sessions to schedule.",
      });
    }

    const consultation = await Consultation.create({
      consultant_ref,
      client_ref: request.client_ref,
      datetime,
      payment_ref: request.payment_ref || undefined,
    });

    request.status = "scheduled";
    request.consultation_ref = consultation._id;
    await request.save();

    if (!request.paid) {
      client.premium_sessions_used += 1;
      await client.save();
    }

    res.json({
      request,
      consultation,
      sessions_remaining:
        client.premium_sessions_total - client.premium_sessions_used,
    });
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
  createRequest,
  getMyRequests,
  getRequests,
  scheduleRequest,
  declineRequest,
};
