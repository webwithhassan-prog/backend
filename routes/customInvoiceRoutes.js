const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const { checkoutLimiter, rejectBots } = require("../middleware/security");
const {
  createCustomInvoice,
  getCustomInvoices,
  deleteCustomInvoice,
  getInvoiceBySession,
  verifyInvoice,
} = require("../controllers/customInvoiceController");

router.get("/session/:sessionId", checkoutLimiter, getInvoiceBySession);

// Public — the universal "/pay" link a client can use to type in an
// amount already agreed with the admin, instead of the admin generating
// a one-off link. Same underlying invoice/payment flow as the admin route.
router.post("/self-serve", checkoutLimiter, rejectBots, createCustomInvoice);

router.get("/verify/:invoiceNumber/:code", protect, adminOnly, verifyInvoice);

router.get("/", protect, adminOnly, getCustomInvoices);
router.post("/", protect, adminOnly, createCustomInvoice);
router.delete("/:id", protect, adminOnly, deleteCustomInvoice);

module.exports = router;
