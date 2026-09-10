const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const {
  getClients,
  createClient,
  getClientById,
  freezeClient,
  resumeClient,
  extendClient,
  banClient,
  unbanClient,
  deleteClient,
  togglePackages,
  deliverDietPlan,
  dismissDietplanNotification,
  recordProgressCheckin,
  completeOnboarding,
  addPushSubscription,
  removePushSubscription,
} = require("../controllers/clientController");

router.get("/", protect, adminOnly, getClients);
router.post("/", protect, adminOnly, createClient);
router.get("/:id", protect, getClientById);
router.put("/:id/freeze", protect, adminOnly, freezeClient);
router.put("/:id/resume", protect, adminOnly, resumeClient);
router.put("/:id/extend", protect, adminOnly, extendClient);
router.put("/:id/ban", protect, adminOnly, banClient);
router.put("/:id/unban", protect, adminOnly, unbanClient);
router.delete("/:id", protect, adminOnly, deleteClient);
router.put("/:id/packages", protect, adminOnly, togglePackages);
router.put("/:id/deliver-dietplan", protect, adminOnly, deliverDietPlan);
router.put(
  "/:id/dismiss-dietplan-notification",
  protect,
  dismissDietplanNotification,
);
router.put("/:id/progress-checkin", protect, recordProgressCheckin);
router.put("/:id/onboarding-complete", protect, completeOnboarding);
router.post("/:id/push-subscription", protect, addPushSubscription);
router.delete("/:id/push-subscription", protect, removePushSubscription);

module.exports = router;
