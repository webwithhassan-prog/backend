const crypto = require("crypto");
const Payment = require("../models/Payment");
const Client = require("../models/Client");
const Plan = require("../models/Plan");
const EBook = require("../models/EBook");
const Course = require("../models/Course");
const SalesLog = require("../models/SalesLog");
const User = require("../models/User");
const Coupon = require("../models/Coupon");
const ManualPaymentMethod = require("../models/ManualPaymentMethod");
const { sendPaymentReceiptEmail } = require("../services/emailService");
const { convertFromInr } = require("../utils/exchangeRates");
const { getNextInvoiceNumber } = require("../models/Counter");
const { getActiveDiscountPercent, applyDiscount } = require("../utils/offerDiscount");
const {
  getCoupon,
  validateCoupon,
  couponAppliesToType,
} = require("../utils/couponDiscount");

const PLAN_TYPE_LABELS = {
  dietplan: "Dietplan",
  workout: "Live Workout Sessions",
  combo: "Complete Package (Dietplan + Workout)",
};
const planDisplayName = (plan) =>
  `${PLAN_TYPE_LABELS[plan.product_type] || plan.product_type} - ${plan.duration_days} Days`;

// @desc Client declares they've sent a manual (bank/JazzCash/Easypaisa)
// payment — creates pending Payment record(s) exactly like a Stripe
// checkout would, but nothing is granted yet. An admin confirms it later
// via /manual/:id/confirm after cross-checking the actual bank/wallet.
const initiateManualPayment = async (req, res) => {
  const {
    client_id,
    type,
    plan_ids,
    ebook_id,
    course_id,
    coupon_code,
    method_id,
    currency_code = "INR",
  } = req.body;

  try {
    const method = await ManualPaymentMethod.findOne({ _id: method_id, active: true });
    if (!method) {
      return res.status(400).json({ message: "Invalid payment method" });
    }
    if (type === "package") {
      if (!plan_ids || plan_ids.length === 0) {
        return res.status(400).json({ message: "At least one plan is required" });
      }
      const plans = await Plan.find({ _id: { $in: plan_ids } });
      if (plans.length !== plan_ids.length) {
        return res.status(404).json({ message: "One or more plans not found" });
      }

      let coupon = null;
      if (coupon_code) {
        coupon = await getCoupon(coupon_code);
        const couponError = validateCoupon(coupon);
        if (couponError) return res.status(400).json({ message: couponError });
      }

      const batchId = crypto.randomUUID();
      const created = [];
      for (const plan of plans) {
        const offerPercent = await getActiveDiscountPercent(plan.product_type);
        const couponPercent =
          coupon && couponAppliesToType(coupon, plan.product_type)
            ? coupon.discount_percent
            : 0;
        const discount_percent = Math.max(offerPercent, couponPercent);
        const finalPrice = applyDiscount(plan.price, discount_percent);

        created.push(
          await Payment.create({
            client_ref: client_id,
            plan_ref: plan._id,
            gateway: "manual",
            manual_method_ref: method._id,
            manual_method_name: method.name,
            amount: finalPrice,
            currency_code,
            status: "pending",
            coupon_code: coupon ? coupon.code : undefined,
            manual_batch_id: batchId,
          }),
        );
      }
      return res.json({ ok: true, payment_ids: created.map((p) => p._id) });
    }

    if (type === "ebook") {
      const ebook = await EBook.findById(ebook_id);
      if (!ebook) return res.status(404).json({ message: "E-book not found" });
      const payment = await Payment.create({
        client_ref: client_id,
        ebook_ref: ebook_id,
        gateway: "manual",
        manual_method_ref: method._id,
        manual_method_name: method.name,
        amount: ebook.price,
        currency_code,
        status: "pending",
      });
      return res.json({ ok: true, payment_ids: [payment._id] });
    }

    if (type === "course") {
      const course = await Course.findById(course_id);
      if (!course) return res.status(404).json({ message: "Course not found" });
      const payment = await Payment.create({
        client_ref: client_id,
        course_ref: course_id,
        gateway: "manual",
        manual_method_ref: method._id,
        manual_method_name: method.name,
        amount: course.price,
        currency_code,
        status: "pending",
      });
      return res.json({ ok: true, payment_ids: [payment._id] });
    }

    return res.status(400).json({ message: "Invalid purchase type" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Admin — list pending manual payments awaiting verification
const listPendingManualPayments = async (req, res) => {
  try {
    const payments = await Payment.find({
      gateway: "manual",
      status: "pending",
    })
      .sort({ createdAt: 1 })
      .populate("client_ref", "name phone_number")
      .populate("plan_ref", "product_type duration_days")
      .populate("ebook_ref", "title")
      .populate("course_ref", "title");

    const items = payments.map((p) => {
      let itemLabel = "Unknown item";
      if (p.plan_ref) itemLabel = planDisplayName(p.plan_ref);
      else if (p.ebook_ref) itemLabel = p.ebook_ref.title;
      else if (p.course_ref) itemLabel = p.course_ref.title;

      return {
        _id: p._id,
        client_name: p.client_ref?.name || "Unknown client",
        client_phone: p.client_ref?.phone_number || "",
        item_label: itemLabel,
        amount: p.amount,
        currency_code: p.currency_code,
        method_name: p.manual_method_name,
        manual_batch_id: p.manual_batch_id,
        created_at: p.createdAt,
      };
    });

    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Shared by ebook/course confirm branches below — both push one ID into
// the client's owned-items array and go through the same completion steps.
const completeSingleItemPayment = async ({
  payment,
  client,
  category,
  itemDoc,
  adminId,
}) => {
  payment.status = "completed";
  payment.amount_settled = payment.amount;
  payment.amount_display = await convertFromInr(payment.amount, payment.currency_code);
  payment.invoice_number = await getNextInvoiceNumber();
  payment.verified_by = adminId;
  payment.verified_at = new Date();
  await payment.save();

  await SalesLog.create({
    category,
    amount: payment.amount,
    amount_settled: payment.amount_settled,
    currency_code: payment.currency_code,
    amount_display: payment.amount_display,
    payment_ref: payment._id,
  });

  try {
    const user = await User.findById(client.user_ref);
    if (user) {
      await sendPaymentReceiptEmail(user.email, {
        items: [
          {
            name: itemDoc?.title || (category === "ebook" ? "E-Book" : "Course"),
            amount: payment.amount,
            amountSettled: payment.amount_settled,
          },
        ],
        total: payment.amount,
        totalSettled: payment.amount_settled,
        paidAt: payment.updatedAt,
        clientName: client.name,
        invoiceNumber: payment.invoice_number,
      });
    }
  } catch (emailErr) {
    console.error("Failed to send receipt email:", emailErr.message);
  }
};

// @desc Admin — confirm a manual payment after verifying it in the actual
// bank/JazzCash/Easypaisa account. Runs the same fulfillment the Stripe
// webhook does (grant the ebook/course, activate the package), just
// triggered by an admin click instead of an automatic webhook.
const confirmManualPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment || payment.gateway !== "manual") {
      return res.status(404).json({ message: "Manual payment not found" });
    }
    if (payment.status !== "pending") {
      return res.status(400).json({ message: "This payment has already been reviewed" });
    }

    const client = await Client.findById(payment.client_ref);
    if (!client) return res.status(404).json({ message: "Client not found" });

    if (payment.ebook_ref) {
      client.purchased_ebooks.push(payment.ebook_ref);
      await client.save();
      const ebook = await EBook.findById(payment.ebook_ref);
      await completeSingleItemPayment({
        payment,
        client,
        category: "ebook",
        itemDoc: ebook,
        adminId: req.user._id,
      });
      return res.json({ message: "Payment confirmed and e-book granted" });
    }

    if (payment.course_ref) {
      client.purchased_courses.push(payment.course_ref);
      await client.save();
      const course = await Course.findById(payment.course_ref);
      await completeSingleItemPayment({
        payment,
        client,
        category: "course",
        itemDoc: course,
        adminId: req.user._id,
      });
      return res.json({ message: "Payment confirmed and course granted" });
    }

    if (payment.plan_ref) {
      // A combo/multi-plan package purchase created one pending Payment per
      // plan, all sharing this manual_batch_id — confirm them together as
      // one purchase under one invoice number, same as the Stripe webhook
      // treats a multi-plan checkout.session.completed event.
      const batchPayments = payment.manual_batch_id
        ? await Payment.find({
            manual_batch_id: payment.manual_batch_id,
            status: "pending",
          })
        : [payment];

      if (payment.coupon_code) {
        await Coupon.updateOne(
          { code: payment.coupon_code },
          { $inc: { used_count: 1 } },
        );
      }

      const invoiceNumber = await getNextInvoiceNumber();
      const receiptItems = [];

      for (const p of batchPayments) {
        const plan = await Plan.findById(p.plan_ref);
        if (!plan) continue;

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + plan.duration_days);
        client.active_plans.push({
          plan_ref: plan._id,
          product_type: plan.product_type,
          expires_at: expiresAt,
        });

        if (plan.product_type === "dietplan" || plan.product_type === "combo") {
          client.has_dietplan = true;
          client.diet_plans_total += plan.diet_plans_included || 0;
          if (!client.last_dietplan_delivered_at) {
            client.last_dietplan_delivered_at = new Date();
          }
        }
        if (plan.product_type === "workout" || plan.product_type === "combo") {
          client.has_workout = true;
        }

        p.status = "completed";
        p.amount_settled = p.amount;
        p.amount_display = await convertFromInr(p.amount, p.currency_code);
        p.invoice_number = invoiceNumber;
        p.verified_by = req.user._id;
        p.verified_at = new Date();
        await p.save();

        await SalesLog.create({
          category: "package",
          amount: p.amount,
          amount_settled: p.amount_settled,
          currency_code: p.currency_code,
          amount_display: p.amount_display,
          payment_ref: p._id,
        });
        receiptItems.push({
          name: planDisplayName(plan),
          amount: p.amount,
          amountSettled: p.amount_settled,
        });
      }

      client.status = "active";
      const furthestExpiry = client.active_plans.reduce(
        (latest, p) => (p.expires_at > latest ? p.expires_at : latest),
        client.access_expires_at && new Date(client.access_expires_at) > new Date()
          ? new Date(client.access_expires_at)
          : new Date(),
      );
      client.access_expires_at = furthestExpiry;
      await client.save();

      if (receiptItems.length > 0) {
        try {
          const user = await User.findById(client.user_ref);
          if (user) {
            await sendPaymentReceiptEmail(user.email, {
              items: receiptItems,
              total: receiptItems.reduce((sum, item) => sum + item.amount, 0),
              totalSettled: receiptItems.reduce(
                (sum, item) => sum + (item.amountSettled || 0),
                0,
              ),
              paidAt: new Date(),
              clientName: client.name,
              invoiceNumber,
            });
          }
        } catch (emailErr) {
          console.error("Failed to send receipt email:", emailErr.message);
        }
      }

      return res.json({ message: "Payment confirmed and package activated" });
    }

    res.status(400).json({ message: "This payment has no associated item" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Admin — reject a manual payment (couldn't be verified in the
// actual account). Rejects the whole batch for a multi-plan package.
const rejectManualPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment || payment.gateway !== "manual") {
      return res.status(404).json({ message: "Manual payment not found" });
    }
    if (payment.status !== "pending") {
      return res.status(400).json({ message: "This payment has already been reviewed" });
    }

    const filter = payment.manual_batch_id
      ? { manual_batch_id: payment.manual_batch_id, status: "pending" }
      : { _id: payment._id };

    await Payment.updateMany(filter, {
      status: "failed",
      verified_by: req.user._id,
      verified_at: new Date(),
    });

    res.json({ message: "Payment rejected" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  initiateManualPayment,
  listPendingManualPayments,
  confirmManualPayment,
  rejectManualPayment,
};
