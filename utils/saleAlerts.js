const Payment = require("../models/Payment");
// Registered here so the populates below work however this file is loaded.
require("../models/Client");
require("../models/Plan");
require("../models/EBook");
require("../models/Course");
const { sendNewSaleAlertEmail } = require("../services/emailService");

const CATEGORY_LABELS = {
  plan: "Package",
  package: "Package",
  ebook: "E-book",
  course: "Course",
  custom: "Custom invoice",
};

const PLAN_TYPE_LABELS = {
  dietplan: "Dietplan",
  workout: "Home Workouts",
  combo: "Both Combined",
};

// Who bought what, for a SalesLog entry — shared by the sale email and the
// admin dashboard's alert bell.
const describeSale = async (sale) => {
  const payment = sale.payment_ref
    ? await Payment.findById(sale.payment_ref)
        .populate("client_ref", "name")
        .populate("plan_ref", "product_type duration_days")
        .populate("ebook_ref", "title")
        .populate("course_ref", "title")
    : null;
  const plan = payment?.plan_ref;
  return {
    id: String(sale._id),
    date: sale.date || sale.createdAt,
    category: CATEGORY_LABELS[sale.category] || sale.category,
    itemLabel: plan
      ? `${PLAN_TYPE_LABELS[plan.product_type] || plan.product_type} — ${plan.duration_days} days`
      : payment?.ebook_ref?.title ||
        payment?.course_ref?.title ||
        CATEGORY_LABELS[sale.category] ||
        "Sale",
    clientName:
      payment?.client_ref?.name || payment?.guest_name || payment?.guest_email || "Guest",
    amountDisplay: sale.amount_display,
    currencyCode: sale.currency_code,
    amountSettled: sale.amount_settled,
    manual: Boolean(payment?.manual_method_ref || payment?.gateway === "manual"),
  };
};

// Emails the monitored inbox about a completed sale. Runs for every
// SalesLog entry (see the hook in models/SalesLog.js), which every sale
// path writes — card checkouts for packages, e-books and courses, and paid
// custom invoices. Manual (bank / JazzCash / Easypaisa) payments are
// skipped: the admin is already emailed when the claim is submitted, and
// approving it is their own action.
const alertAdminOfSale = async (sale) => {
  const details = await describeSale(sale);
  if (details.manual) return;
  await sendNewSaleAlertEmail(details);
};

module.exports = { alertAdminOfSale, describeSale };
