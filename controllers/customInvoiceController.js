const crypto = require("crypto");
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const CustomInvoice = require("../models/CustomInvoice");
const Payment = require("../models/Payment");
const SalesLog = require("../models/SalesLog");
const { getNextInvoiceNumber } = require("../models/Counter");
const { inrToGbpPence } = require("../utils/currency");
const { sendPaymentReceiptEmail } = require("../services/emailService");

// Deterministic 8-char stamp of an invoice's true amount, keyed with the
// server's JWT secret so it can't be reproduced without server access —
// a tampered slip (edited amount) won't match the code printed on it.
const getVerificationCode = (invoice_number, amount) =>
  crypto
    .createHmac("sha256", process.env.JWT_SECRET)
    .update(`${invoice_number}:${amount}`)
    .digest("hex")
    .slice(0, 8)
    .toUpperCase();

// @desc Create a one-off payment link for a negotiated/off-menu deal (admin)
const createCustomInvoice = async (req, res) => {
  const {
    description,
    amount,
    client_name,
    client_email,
    client_phone,
    currency_code,
    amount_display,
  } = req.body;

  try {
    if (!description || !amount || !client_name) {
      return res.status(400).json({
        message: "Description, amount, and client name are required",
      });
    }
    if (Number(amount) <= 0 || Number(amount) > 10000000) {
      return res.status(400).json({ message: "Enter a valid amount" });
    }

    const invoice_number = await getNextInvoiceNumber();

    const invoice = await CustomInvoice.create({
      invoice_number,
      description,
      amount: Number(amount),
      client_name,
      client_email: client_email || null,
      client_phone: client_phone || null,
      currency_code: currency_code || "INR",
      amount_display: amount_display != null ? Number(amount_display) : null,
      verification_code: getVerificationCode(invoice_number, Number(amount)),
    });

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: { name: description },
            unit_amount: await inrToGbpPence(Number(amount)),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      // Custom invoices are negotiated off-menu deals — could be anything,
      // so this can't safely claim a "fully automated digital product" tax
      // code. Stays on classic Checkout.
      managed_payments: { enabled: false },
      success_url: `${process.env.CLIENT_URL}/invoice-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/payment-cancelled`,
      customer_email: client_email || undefined,
      metadata: {
        type: "custom_invoice",
        invoice_id: invoice._id.toString(),
      },
    });

    invoice.stripe_session_id = session.id;
    await invoice.save();

    res.status(201).json({ invoice, url: session.url });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc List all custom invoices (admin)
const getCustomInvoices = async (req, res) => {
  try {
    const invoices = await CustomInvoice.find().sort({ createdAt: -1 });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Delete a custom invoice — only while still unpaid (admin)
const deleteCustomInvoice = async (req, res) => {
  try {
    const invoice = await CustomInvoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    if (invoice.status === "paid") {
      return res
        .status(400)
        .json({ message: "Can't delete an invoice that's already been paid" });
    }
    await invoice.deleteOne();
    res.json({ message: "Invoice removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Get a paid invoice's details by its Stripe session (public — for the
// client's payment slip page, verified directly against Stripe like the
// other receipt endpoints so a client can't spoof someone else's invoice)
const getInvoiceBySession = async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(
      req.params.sessionId,
    );
    if (session.payment_status !== "paid") {
      return res.status(400).json({ message: "Payment not completed yet" });
    }
    if (session.metadata.type !== "custom_invoice") {
      return res.status(404).json({ message: "Invoice not found" });
    }

    let invoice = await CustomInvoice.findById(session.metadata.invoice_id);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    // The browser can land here before Stripe's webhook has fired — Stripe
    // itself already confirms payment_status "paid" above, so finish the
    // same completion Stripe's webhook would (idempotent — it no-ops if the
    // webhook already ran) rather than serving an invoice with no paid_at.
    if (invoice.status !== "paid") {
      await completeCustomInvoice(session);
      invoice = await CustomInvoice.findById(session.metadata.invoice_id);
    }

    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Handle a completed custom-invoice checkout — called from the shared
// Stripe webhook handler once payment is confirmed
const completeCustomInvoice = async (session) => {
  const invoice = await CustomInvoice.findById(session.metadata.invoice_id);
  if (!invoice || invoice.status === "paid") return;

  invoice.status = "paid";
  invoice.paid_at = new Date();
  await invoice.save();

  const payment = await Payment.create({
    gateway: "stripe",
    amount: invoice.amount,
    amount_settled: session.amount_total / 100,
    currency_code: invoice.currency_code,
    amount_display: invoice.amount_display,
    status: "completed",
    invoice_number: invoice.invoice_number,
  });

  await SalesLog.create({
    category: "custom",
    amount: invoice.amount,
    amount_settled: payment.amount_settled,
    currency_code: invoice.currency_code,
    amount_display: invoice.amount_display,
    payment_ref: payment._id,
  });

  if (invoice.client_email) {
    try {
      await sendPaymentReceiptEmail(invoice.client_email, {
        items: [{ name: invoice.description, amount: invoice.amount }],
        total: invoice.amount,
        paidAt: invoice.paid_at,
        clientName: invoice.client_name,
        invoiceNumber: invoice.invoice_number,
      });
    } catch (emailErr) {
      console.error("Failed to send invoice receipt email:", emailErr.message);
    }
  }
};

// @desc Admin checks a client-shown invoice slip against what's actually
// stored — catches an edited/photoshopped amount, since the code only
// matches the real, untouched invoice data.
const verifyInvoice = async (req, res) => {
  try {
    const invoice = await CustomInvoice.findOne({
      invoice_number: req.params.invoiceNumber,
    });
    if (!invoice) {
      return res.status(404).json({ valid: false, message: "No such invoice number" });
    }

    const expected = getVerificationCode(invoice.invoice_number, invoice.amount);
    const submitted = (req.params.code || "").toUpperCase();
    if (expected !== submitted) {
      return res.json({ valid: false, message: "Code does not match — this slip may have been altered" });
    }

    res.json({ valid: true, invoice });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createCustomInvoice,
  getCustomInvoices,
  deleteCustomInvoice,
  getInvoiceBySession,
  completeCustomInvoice,
  verifyInvoice,
};
