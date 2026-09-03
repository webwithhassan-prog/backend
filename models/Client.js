const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema(
  {
    user_ref: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    phone_number: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "paused", "expired"],
      default: "expired",
    },
    access_expires_at: {
      type: Date,
      default: null,
    },
    has_dietplan: {
      type: Boolean,
      default: false,
    },
    has_workout: {
      type: Boolean,
      default: false,
    },
    has_premium: {
      type: Boolean,
      default: false,
    },
    diet_plans_total: {
      type: Number,
      default: 0,
    },
    diet_plans_used: {
      type: Number,
      default: 0,
    },
    premium_sessions_total: {
      type: Number,
      default: 0,
    },
    premium_sessions_used: {
      type: Number,
      default: 0,
    },
    last_progress_checkin: {
      type: Date,
      default: null,
    },
    onboarding_completed: {
      type: Boolean,
      default: false,
    },
    active_plans: [
      {
        plan_ref: { type: mongoose.Schema.Types.ObjectId, ref: "Plan" },
        product_type: { type: String, enum: ["dietplan", "workout"] },
        expires_at: Date,
      },
    ],
    purchased_ebooks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EBook",
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Client", clientSchema);
