const Application = require("../models/Application");
const Trainer = require("../models/Trainer");

// @desc Submit a job application (public)
const createApplication = async (req, res) => {
  try {
    const application = await Application.create(req.body);
    res.status(201).json(application);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Get all applications (admin)
const getApplications = async (req, res) => {
  try {
    const applications = await Application.find();
    res.json(applications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Approve an application — sets offer terms AND creates the live Trainer listing
const approveApplication = async (req, res) => {
  const { offer_terms } = req.body;

  try {
    const application = await Application.findById(req.params.id);
    if (!application)
      return res.status(404).json({ message: "Application not found" });

    application.status = "approved";
    application.offer_terms = offer_terms;
    await application.save();

    // Create the Trainer listing if one doesn't already exist for this application
    const existingTrainer = await Trainer.findOne({
      name: application.name,
      specialty: application.specialty,
    });

    let trainer = existingTrainer;
    if (!trainer) {
      trainer = await Trainer.create({
        name: application.name,
        specialty: application.specialty,
      });
    }

    res.json({ application, trainer });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Reject an application
const rejectApplication = async (req, res) => {
  try {
    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true },
    );
    if (!application)
      return res.status(404).json({ message: "Application not found" });
    res.json(application);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Delete an application
const deleteApplication = async (req, res) => {
  try {
    const application = await Application.findByIdAndDelete(req.params.id);
    if (!application)
      return res.status(404).json({ message: "Application not found" });
    res.json({ message: "Application removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createApplication,
  getApplications,
  approveApplication,
  rejectApplication,
  deleteApplication,
};
