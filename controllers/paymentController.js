const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const Payment = require("../models/Payment");
const Client = require("../models/Client");
const Plan = require("../models/Plan");
const PremiumAddon = require("../models/PremiumAddon");
const EBook = require("../models/EBook");
const SalesLog = require("../models/SalesLog");
const User = require("../models/User");
const { sendPaymentReceiptEmail } = require("../services/emailService");
const { pkrToUsdCents } = require("../utils/currency");
const { getActiveDiscountPercent, applyDiscount } = require("../utils/offerDiscount");
const Coupon = require("../models/Coupon");
const {
  getCoupon,
  validateCoupon,
  couponAppliesToType,
} = require("../utils/couponDiscount");

// @desc Create a Stripe checkout session for one or more plans + optional premium add-on
const createStripeCheckout = async (req, res) => {
  const { client_id, plan_ids, include_premium, coupon_code } = req.body;

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

    const line_items = pricedPlans.map(({ plan, finalPrice }) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: `${plan.product_type === "dietplan" ? "Dietplan" : "Live Workout Sessions"} - ${plan.duration_days} Days`,
        },
        unit_amount: pkrToUsdCents(finalPrice),
      },
      quantity: 1,
    }));

    let premiumAddon = null;
    if (include_premium) {
      premiumAddon = await PremiumAddon.findOne();
      if (premiumAddon) {
        line_items.push({
          price_data: {
            currency: "usd",
            product_data: { name: premiumAddon.name },
            unit_amount: pkrToUsdCents(premiumAddon.price),
          },
          quantity: 1,
        });
      }
    }

    const session = await stripe.checkout.sessions.create({
      line_items,
      mode: "payment",
      managed_payments: { enabled: false },
      success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/payment-cancelled`,
      metadata: {
        type: "package",
        client_id,
        plan_ids: plan_ids.join(","),
        include_premium: include_premium ? "true" : "false",
        coupon_code: coupon ? coupon.code : "",
      },
    });

    for (const { plan, finalPrice } of pricedPlans) {
      await Payment.create({
        client_ref: client_id,
        plan_ref: plan._id,
        gateway: "stripe",
        amount: finalPrice,
        status: "pending",
        coupon_code: coupon ? coupon.code : undefined,
      });
    }
    if (premiumAddon) {
      await Payment.create({
        client_ref: client_id,
        gateway: "stripe",
        amount: premiumAddon.price,
        status: "pending",
      });
    }

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Create a Stripe checkout session for an e-book
const createEbookCheckout = async (req, res) => {
  const { client_id, ebook_id } = req.body;

  try {
    const ebook = await EBook.findById(ebook_id);
    if (!ebook) return res.status(404).json({ message: "E-book not found" });

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: ebook.title },
            unit_amount: pkrToUsdCents(ebook.price),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      managed_payments: { enabled: false },
      success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/payment-cancelled`,
      metadata: {
        type: "ebook",
        client_id,
        ebook_id,
      },
    });

    await Payment.create({
      client_ref: client_id,
      gateway: "stripe",
      amount: ebook.price,
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

    // E-book purchase
    if (session.metadata.type === "ebook") {
      const { client_id, ebook_id } = session.metadata;
      const client = await Client.findById(client_id);
      if (client) {
        client.purchased_ebooks.push(ebook_id);
        await client.save();

        const payment = await Payment.findOneAndUpdate(
          { client_ref: client_id, status: "pending" },
          { status: "completed" },
          { new: true, sort: { createdAt: -1 } },
        );
        if (payment) {
          await SalesLog.create({
            category: "ebook",
            amount: payment.amount,
            payment_ref: payment._id,
          });

          try {
            const [user, ebook] = await Promise.all([
              User.findById(client.user_ref),
              EBook.findById(ebook_id),
            ]);
            if (user) {
              await sendPaymentReceiptEmail(user.email, {
                items: [{ name: ebook?.title || "E-Book", amount: payment.amount }],
                total: payment.amount,
                paidAt: payment.updatedAt,
              });
            }
          } catch (emailErr) {
            console.error("Failed to send receipt email:", emailErr.message);
          }
        }
      }
      return res.json({ received: true });
    }

    // Package purchase (Dietplan / Workout / Combo + optional Premium)
    const { client_id, plan_ids, include_premium, coupon_code } =
      session.metadata;
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

    for (const plan of plans) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + plan.duration_days);

      client.active_plans.push({
        plan_ref: plan._id,
        product_type: plan.product_type,
        expires_at: expiresAt,
      });

      if (plan.product_type === "dietplan") {
        client.has_dietplan = true;
        client.diet_plans_total += plan.diet_plans_included || 0;
        if (!client.last_dietplan_delivered_at) {
          client.last_dietplan_delivered_at = new Date();
        }
      }
      if (plan.product_type === "workout") client.has_workout = true;

      const payment = await Payment.findOneAndUpdate(
        { client_ref: client_id, plan_ref: plan._id, status: "pending" },
        { status: "completed" },
        { new: true },
      );
      if (payment) {
        await SalesLog.create({
          category: "package",
          amount: payment.amount,
          payment_ref: payment._id,
        });
        receiptItems.push({
          name: `${plan.product_type === "dietplan" ? "Dietplan" : "Live Workout Sessions"} - ${plan.duration_days} Days`,
          amount: payment.amount,
        });
      }
    }

    if (include_premium === "true") {
      client.has_premium = true;
      const premiumAddon = await PremiumAddon.findOne();
      client.premium_sessions_total += premiumAddon?.sessions_included || 1;

      const premiumPayment = await Payment.findOneAndUpdate(
        { client_ref: client_id, plan_ref: null, status: "pending" },
        { status: "completed" },
        { new: true, sort: { createdAt: -1 } },
      );
      if (premiumPayment) {
        await SalesLog.create({
          category: "package",
          amount: premiumPayment.amount,
          payment_ref: premiumPayment._id,
        });
        receiptItems.push({
          name: premiumAddon?.name || "Premium Add-on",
          amount: premiumPayment.amount,
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
            paidAt: new Date(),
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
        status: "completed",
      }).sort({ updatedAt: -1 });

      return res.json({
        items: [{ name: ebook?.title || "E-Book", amount: payment?.amount || 0 }],
        total: payment?.amount || 0,
        clientName: client.name,
        paidAt: payment?.updatedAt || new Date(),
      });
    }

    const planIdList = session.metadata.plan_ids.split(",");
    const plans = await Plan.find({ _id: { $in: planIdList } });
    const items = [];
    let total = 0;
    let paidAt = new Date();

    for (const plan of plans) {
      const payment = await Payment.findOne({
        client_ref: client._id,
        plan_ref: plan._id,
        status: "completed",
      }).sort({ updatedAt: -1 });
      if (payment) {
        items.push({
          name: `${plan.product_type === "dietplan" ? "Dietplan" : "Live Workout Sessions"} - ${plan.duration_days} Days`,
          amount: payment.amount,
        });
        total += payment.amount;
        paidAt = payment.updatedAt;
      }
    }

    if (session.metadata.include_premium === "true") {
      const premiumPayment = await Payment.findOne({
        client_ref: client._id,
        plan_ref: null,
        status: "completed",
      }).sort({ updatedAt: -1 });
      if (premiumPayment) {
        const premiumAddon = await PremiumAddon.findOne();
        items.push({
          name: premiumAddon?.name || "Premium Add-on",
          amount: premiumPayment.amount,
        });
        total += premiumPayment.amount;
      }
    }

    res.json({ items, total, clientName: client.name, paidAt });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Record a 1-on-1 consultation payment with 15% platform commission
const recordConsultationPayment = async (req, res) => {
  const { client_id, professional_id, amount, gateway } = req.body;

  try {
    const commission_amount = Number(amount) * 0.15;

    const payment = await Payment.create({
      client_ref: client_id,
      professional_ref: professional_id,
      gateway,
      amount,
      commission_amount,
      status: "completed",
    });

    await SalesLog.create({
      category: "consultation",
      amount: payment.amount,
      payment_ref: payment._id,
    });

    res.status(201).json(payment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createStripeCheckout,
  createEbookCheckout,
  stripeWebhook,
  getCheckoutSessionDetails,
  recordConsultationPayment,
};
