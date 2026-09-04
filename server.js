require("dotenv").config();
const dns = require("dns");
// Render's network can't route outbound IPv6, but Node resolves hosts like
// Gmail's SMTP server to an IPv6 address first, causing ENETUNREACH. This
// forces IPv4 first for every outbound connection app-wide.
dns.setDefaultResultOrder("ipv4first");
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const trainerRoutes = require("./routes/trainerRoutes");
const consultantRoutes = require("./routes/consultantRoutes");
const planRoutes = require("./routes/planRoutes");
const premiumAddonRoutes = require("./routes/premiumAddonRoutes");
const ebookRoutes = require("./routes/ebookRoutes");
const clientRoutes = require("./routes/clientRoutes");
const classRoutes = require("./routes/classRoutes");
const consultationRoutes = require("./routes/consultationRoutes");
const consultationRequestRoutes = require("./routes/consultationRequestRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const contentRoutes = require("./routes/contentRoutes");
const joinRoutes = require("./routes/joinRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const salesRoutes = require("./routes/salesRoutes");
const dayPlanRoutes = require("./routes/dayPlanRoutes");
const timeSlotRoutes = require("./routes/timeSlotRoutes");
const timetableRoutes = require("./routes/timetableRoutes");
const dailyLogRoutes = require("./routes/dailyLogRoutes");
const offerRoutes = require("./routes/offerRoutes");
const couponRoutes = require("./routes/couponRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");

const app = express();

connectDB();

app.use(cors());
app.use(
  "/api/payments/stripe/webhook",
  express.raw({ type: "application/json" }),
);
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Fitness Platform API running");
});
app.use("/api/auth", authRoutes);
app.use("/api/trainers", trainerRoutes);
app.use("/api/consultants", consultantRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/premium-addon", premiumAddonRoutes);
app.use("/api/ebooks", ebookRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/consultations", consultationRoutes);
app.use("/api/consultation-requests", consultationRequestRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/join", joinRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/day-plans", dayPlanRoutes);
app.use("/api/time-slots", timeSlotRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/daily-logs", dailyLogRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/analytics", analyticsRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
