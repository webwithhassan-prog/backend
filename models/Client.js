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
    banned: {
      type: Boolean,
      default: false,
    },
    ban_reason: {
      type: String,
      default: null,
    },
    country: {
      type: String,
      default: null,
    },
    country_code: {
      type: String,
      default: null,
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
    diet_plans_total: {
      type: Number,
      default: 0,
    },
    diet_plans_used: {
      type: Number,
      default: 0,
    },
    last_dietplan_delivered_at: {
      type: Date,
      default: null,
    },
    dietplan_notification_pending: {
      type: Boolean,
      default: false,
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
        product_type: { type: String, enum: ["dietplan", "workout", "combo"] },
        expires_at: Date,
      },
    ],
    purchased_ebooks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EBook",
      },
    ],
    purchased_courses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
      },
    ],
    push_subscriptions: [
      {
        endpoint: { type: String, required: true },
        keys: {
          p256dh: { type: String, required: true },
          auth: { type: String, required: true },
        },
        created_at: { type: Date, default: Date.now },
      },
    ],
    last_checkin_reminder_sent_at: {
      type: Date,
      default: null,
    },
    // "YYYY-MM-DD" in PKT (via dateStringPKT()) — guards the daily class
    // reminder from resending twice on the same PKT calendar day.
    last_class_reminder_sent_date: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Client", clientSchema);
