const mongoose = require('mongoose');

const consultationRequestSchema = new mongoose.Schema(
  {
    client_ref: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    specialty: {
      type: String,
      enum: ['dietician', 'gynecologist', 'psychiatrist', 'personal_trainer', 'other'],
      required: true,
    },
    preferred_consultant_ref: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consultant',
      default: null,
    },
    preferred_time: {
      type: String,
    },
    status: {
      type: String,
      enum: ['pending', 'scheduled', 'declined'],
      default: 'pending',
    },
    consultation_ref: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consultation',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ConsultationRequest', consultationRequestSchema);