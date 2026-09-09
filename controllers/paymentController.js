const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const Payment = require("../models/Payment");
const Client = require("../models/Client");
const Plan = require("../models/Plan");
const EBook = require("../models/EBook");
const Course = require("../models/Course");
const SalesLog = require("../models/SalesLog");
const User = require("../models/User");
const { sendPaymentReceiptEmail } = require("../services/emailService");
const { inrToGbpPence } = require("../utils/currency");
const { convertFromInr } = require("../utils/exchangeRates");
const { getNextInvoiceNumber } = require("../models/Counter");
const { completeCustomInvoice } = require("./customInvoiceController");
const { getActiveDiscountPercent, applyDiscount } = require("../utils/offerDiscount");
const Coupon = require("../models/Coupon");
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

// Stripe's Managed Payments requires an eligible tax code per line item, and
// only covers "fully automated" digital products with no human delivery —
// which rules out dietplans and live workout sessions (real human-delivered
// services). Only e-books and courses (pre-recorded, no live instructor)
// genuinely qualify, so only those two run through it; everything else
// stays on classic Checkout via managed_payments: false.
const TAX_CODES = {
  ebook: "txcd_10302000", // Digital Books - downloaded, permanent rights
  course: "txcd_20060158", // On demand Online Courses - streamed
};

// @desc Create a Stripe checkout session for one or more plans
const createStripeCheckout = async (req, res) => {
  const {
    client_id,
    plan_ids,
    coupon_code,
    currency_code = "INR",
  } = req.body;

  try {
    if (!plan_ids || plan_ids.length === 0) {
      return res.status(400).json({ message: "At least one plan is required" });
    }

    const plans = await Plan.find({ _id: { $in: plan_ids } });
    if (plans.length !== plan_ids.length) {
      return res.status(404).json({ message: "One or more plans not found" });
    }

    // Coupon is validated here, never trusting a client-supplied discount.
    let coupon = null;
    if (coupon_code) {
      coupon = await getCoupon(coupon_code);
      const couponError = validateCoupon(coupon);
      if (couponError) {
        return res.status(400).json({ message: couponError });
      }
    }

    // Discount is recomputed here from the active Offer and Coupon (best of the
    // two wins), never trusting a client-supplied price — this is the only
    // source of truth for what's charged.
    const pricedPlans = await Promise.all(
      plans.map(async (plan) => {
        const offerPercent = await getActiveDiscountPercent(plan.product_type);
        const couponPercent =
          coupon && couponAppliesToType(coupon, plan.product_type)
            ? coupon.discount_percent
            : 0;
        const discount_percent = Math.max(offerPercent, couponPercent);
        return { plan, finalPrice: applyDiscount(plan.price, discount_percent) };
      }),
    );

    const line_items = await Promise.all(
      pricedPlans.map(async ({ plan, finalPrice }) => ({
        price_data: {
          currency: "gbp",
          product_data: {
            name: planDisplayName(plan),
          },
          unit_amount: await inrToGbpPence(finalPrice),
        },
        quantity: 1,
      })),
    );

    const session = await stripe.checkout.sessions.create({
      line_items,
      mode: "payment",
      // Dietplans and live workout sessions involve real human delivery
      // (dietitian review, live trainer-led classes) — Stripe's Managed
      // Payments explicitly excludes anything but a fully automated digital
      // product, so this stays on classic Checkout.
      //
      // No explicit payment_method_types here on purpose: Stripe rejects
      // the *entire* session at creation time if a listed type isn't
      // activated on the account (confirmed live — PayPal broke checkout
      // for every customer, not just PayPal users, the moment it was added
      // without first activating it in the Stripe dashboard). Omitting the
      // field lets Stripe fall back to whatever's actually enabled — Card
      // plus Apple Pay/Google Pay for eligible devices. Re-add "paypal"
      // here once it's confirmed active under Settings -> Payment methods.
      managed_payments: { enabled: false },
      success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/payment-cancelled`,
      metadata: {
        type: "package",
        client_id,
        plan_ids: plan_ids.join(","),
        coupon_code: coupon ? coupon.code : "",
        display_currency: currency_code,
      },
    });

    for (const { plan, finalPrice } of pricedPlans) {
      await Payment.create({
        client_ref: client_id,
        plan_ref: plan._id,
        gateway: "stripe",
        amount: finalPrice,
        currency_code,
        status: "pending",
        coupon_code: coupon ? coupon.code : undefined,
      });
    }

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Create a Stripe checkout session for an e-book
const createEbookCheckout = async (req, res) => {
  const { client_id, ebook_id, currency_code = "INR" } = req.body;

  try {
    const ebook = await EBook.findById(ebook_id);
    if (!ebook) return res.status(404).json({ message: "E-book not found" });

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: { name: ebook.title, tax_code: TAX_CODES.ebook },
            unit_amount: await inrToGbpPence(ebook.price),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/payment-cancelled`,
      metadata: {
        type: "ebook",
        client_id,
        ebook_id,
        display_currency: currency_code,
      },
    });

    await Payment.create({
      client_ref: client_id,
      ebook_ref: ebook_id,
      gateway: "stripe",
      amount: ebook.price,
      currency_code,
      status: "pending",
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Create a Stripe checkout session for a course
const createCourseCheckout = async (req, res) => {
  const { client_id, course_id, currency_code = "INR" } = req.body;

  try {
    const course = await Course.findById(course_id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: { name: course.title, tax_code: TAX_CODES.course },
            unit_amount: await inrToGbpPence(course.price),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/payment-cancelled`,
      metadata: {
        type: "course",
        client_id,
        course_id,
        display_currency: currency_code,
      },
    });

    await Payment.create({
      client_ref: client_id,
      course_ref: course_id,
      gateway: "stripe",
      amount: course.price,
      currency_code,
      status: "pending",
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Stripe webhook — confirm payment, activate client's plans or unlock e-book
const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    // Custom/off-menu invoice (manually created payment link)
    if (session.metadata.type === "custom_invoice") {
      await completeCustomInvoice(session);
      return res.json({ received: true });
    }

    // E-book purchase
    if (session.metadata.type === "ebook") {
      const { client_id, ebook_id } = session.metadata;
      const client = await Client.findById(client_id);
      if (client) {
        client.purchased_ebooks.push(ebook_id);
        await client.save();

        const payment = await Payment.findOneAndUpdate(
          { client_ref: client_id, ebook_ref: ebook_id, status: "pending" },
          { status: "completed", amount_settled: session.amount_total / 100 },
          { new: true, sort: { createdAt: -1 } },
        );
        if (payment) {
          payment.amount_display = await convertFromInr(
            payment.amount,
            payment.currency_code,
          );
          payment.invoice_number = await getNextInvoiceNumber();
          await payment.save();

          await SalesLog.create({
            category: "ebook",
            amount: payment.amount,
            amount_settled: payment.amount_settled,
            currency_code: payment.currency_code,
            amount_display: payment.amount_display,
            payment_ref: payment._id,
          });

          try {
            const [user, ebook] = await Promise.all([
              User.findById(client.user_ref),
              EBook.findById(ebook_id),
            ]);
            if (user) {
              await sendPaymentReceiptEmail(user.email, {
                items: [
                  {
                    name: ebook?.title || "E-Book",
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
        }
      }
      return res.json({ received: true });
    }

    // Course purchase
    if (session.metadata.type === "course") {
      const { client_id, course_id } = session.metadata;
      const client = await Client.findById(client_id);
      if (client) {
        client.purchased_courses.push(course_id);
        await client.save();

        const payment = await Payment.findOneAndUpdate(
          { client_ref: client_id, course_ref: course_id, status: "pending" },
          { status: "completed", amount_settled: session.amount_total / 100 },
          { new: true, sort: { createdAt: -1 } },
        );
        if (payment) {
          payment.amount_display = await convertFromInr(
            payment.amount,
            payment.currency_code,
          );
          payment.invoice_number = await getNextInvoiceNumber();
          await payment.save();

          await SalesLog.create({
            category: "course",
            amount: payment.amount,
            amount_settled: payment.amount_settled,
            currency_code: payment.currency_code,
            amount_display: payment.amount_display,
            payment_ref: payment._id,
          });

          try {
            const [user, course] = await Promise.all([
              User.findById(client.user_ref),
              Course.findById(course_id),
            ]);
            if (user) {
              await sendPaymentReceiptEmail(user.email, {
                items: [
                  {
                    name: course?.title || "Course",
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
        }
      }
      return res.json({ received: true });
    }

    // Package purchase (Dietplan / Workout / Combo)
    const { client_id, plan_ids, coupon_code } = session.metadata;
    const planIdList = plan_ids.split(",");

    const client = await Client.findById(client_id);
    if (!client) return res.json({ received: true });

    if (coupon_code) {
      await Coupon.updateOne(
        { code: coupon_code },
        { $inc: { used_count: 1 } },
      );
    }

    const plans = await Plan.find({ _id: { $in: planIdList } });
    const receiptItems = [];
    // One invoice number for the whole checkout — a combo fallback can
    // complete as two separate Payment records (dietplan + workout), but
    // they're one purchase and should share one invoice number.
    const invoiceNumber = await getNextInvoiceNumber();

    for (const plan of plans) {
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

      const payment = await Payment.findOneAndUpdate(
        { client_ref: client_id, plan_ref: plan._id, status: "pending" },
        { status: "completed" },
        { new: true },
      );
      if (payment) {
        payment.amount_settled = (await inrToGbpPence(payment.amount)) / 100;
        payment.amount_display = await convertFromInr(
          payment.amount,
          payment.currency_code,
        );
        payment.invoice_number = invoiceNumber;
        await payment.save();

        await SalesLog.create({
          category: "package",
          amount: payment.amount,
          amount_settled: payment.amount_settled,
          currency_code: payment.currency_code,
          amount_display: payment.amount_display,
          payment_ref: payment._id,
        });
        receiptItems.push({
          name: planDisplayName(plan),
          amount: payment.amount,
          amountSettled: payment.amount_settled,
        });
      }
    }

    client.status = "active";
    const furthestExpiry = client.active_plans.reduce(
      (latest, p) => (p.expires_at > latest ? p.expires_at : latest),
      client.access_expires_at &&
        new Date(client.access_expires_at) > new Date()
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
  }

  res.json({ received: true });
};

// @desc Get a completed checkout's items/total for the client's receipt image
// (never trusts client-supplied amounts — rebuilds everything from the
// actual completed Payment records, same source of truth as the email receipt)
const getCheckoutSessionDetails = async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    if (session.payment_status !== "paid") {
      return res.status(400).json({ message: "Payment not completed yet" });
    }

    const client = await Client.findOne({ user_ref: req.user._id });
    if (!client || client._id.toString() !== session.metadata.client_id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (session.metadata.type === "ebook") {
      const ebook = await EBook.findById(session.metadata.ebook_id);
      const payment = await Payment.findOne({
        client_ref: client._id,
        ebook_ref: session.metadata.ebook_id,
        status: "completed",
      }).sort({ updatedAt: -1 });

      return res.json({
        items: [{ name: ebook?.title || "E-Book", amount: payment?.amount || 0 }],
        total: payment?.amount || 0,
        clientName: client.name,
        paidAt: payment?.updatedAt || new Date(),
        invoiceNumber: payment?.invoice_number,
      });
    }

    if (session.metadata.type === "course") {
      const course = await Course.findById(session.metadata.course_id);
      const payment = await Payment.findOne({
        client_ref: client._id,
        course_ref: session.metadata.course_id,
        status: "completed",
      }).sort({ updatedAt: -1 });

      return res.json({
        items: [{ name: course?.title || "Course", amount: payment?.amount || 0 }],
        total: payment?.amount || 0,
        clientName: client.name,
        paidAt: payment?.updatedAt || new Date(),
        invoiceNumber: payment?.invoice_number,
      });
    }

    const planIdList = session.metadata.plan_ids.split(",");
    const plans = await Plan.find({ _id: { $in: planIdList } });
    const items = [];
    let total = 0;
    let paidAt = new Date();
    let invoiceNumber;

    for (const plan of plans) {
      const payment = await Payment.findOne({
        client_ref: client._id,
        plan_ref: plan._id,
        status: "completed",
      }).sort({ updatedAt: -1 });
      if (payment) {
        items.push({
          name: planDisplayName(plan),
          amount: payment.amount,
        });
        total += payment.amount;
        paidAt = payment.updatedAt;
        invoiceNumber = payment.invoice_number;
      }
    }

    res.json({ items, total, clientName: client.name, paidAt, invoiceNumber });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createStripeCheckout,
  createEbookCheckout,
  createCourseCheckout,
  stripeWebhook,
  getCheckoutSessionDetails,
};
