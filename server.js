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
const planRoutes = require("./routes/planRoutes");
const ebookRoutes = require("./routes/ebookRoutes");
const clientRoutes = require("./routes/clientRoutes");
const classRoutes = require("./routes/classRoutes");
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
const testimonialRoutes = require("./routes/testimonialRoutes");
const demoVideoRoutes = require("./routes/demoVideoRoutes");
const transformationVideoRoutes = require("./routes/transformationVideoRoutes");
const currencyRoutes = require("./routes/currencyRoutes");
const customInvoiceRoutes = require("./routes/customInvoiceRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const courseRoutes = require("./routes/courseRoutes");
const recordedGalleryRoutes = require("./routes/recordedGalleryRoutes");
const heroBannerRoutes = require("./routes/heroBannerRoutes");
const { startDietplanScheduler } = require("./utils/dietplanScheduler");
const { startClassScheduler } = require("./utils/classScheduler");
const { startZoomRotationScheduler } = require("./utils/zoomLinkRotation");

const app = express();

// Render sits behind a proxy — without this, req.ip is the proxy's address
// instead of the real visitor IP, breaking IP-based country lookups.
app.set("trust proxy", true);

connectDB().then(() => {
  startDietplanScheduler();
  // Zoom link rotation runs first — the class scheduler copies each slot's
  // current link onto that day's generated classes, so slots should have
  // a link (or already be mid-rotation) before regeneration reads them.
  startZoomRotationScheduler();
  startClassScheduler();
});

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
app.use("/api/plans", planRoutes);
app.use("/api/ebooks", ebookRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/classes", classRoutes);
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
app.use("/api/testimonials", testimonialRoutes);
app.use("/api/demo-videos", demoVideoRoutes);
app.use("/api/transformation-videos", transformationVideoRoutes);
app.use("/api/currency", currencyRoutes);
app.use("/api/custom-invoices", customInvoiceRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/recorded-gallery", recordedGalleryRoutes);
app.use("/api/hero-banners", heroBannerRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
