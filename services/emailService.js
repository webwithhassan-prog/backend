const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false, // true for port 465, false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Force IPv4 — some hosts (e.g. Render) can't route outbound IPv6, and
  // Node resolves Gmail's SMTP host to an IPv6 address first, causing
  // ENETUNREACH. This forces the IPv4 route instead.
  family: 4,
});

const sendPasswordResetEmail = async (toEmail, resetUrl) => {
  await transporter.sendMail({
    from: `"Fitness Zone" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Reset your Fitness Zone password",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #12224A;">Reset your password</h2>
        <p>You requested a password reset for your Fitness Zone account. Click the button below to set a new password. This link expires in 30 minutes.</p>
        <a href="${resetUrl}" style="display: inline-block; background: #F76B1C; color: white; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: bold; margin: 16px 0;">
          Reset Password
        </a>
        <p style="color: #666; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
};

const sendPaymentReceiptEmail = async (toEmail, { items, total, paidAt }) => {
  const rows = items
    .map(
      (item) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #eaf1ff; color: #12224A;">${item.name}</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #eaf1ff; color: #12224A; text-align: right;">Rs ${item.amount.toLocaleString()}</td>
        </tr>`,
    )
    .join("");

  await transporter.sendMail({
    from: `"Fitness Zone" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Your Fitness Zone payment receipt",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #12224A;">Payment received — thank you!</h2>
        <p style="color: #666;">Paid on ${new Date(paidAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          ${rows}
          <tr>
            <td style="padding: 12px 0; font-weight: bold; color: #12224A;">Total</td>
            <td style="padding: 12px 0; font-weight: bold; color: #12224A; text-align: right;">Rs ${total.toLocaleString()}</td>
          </tr>
        </table>
        <p style="color: #666; font-size: 13px;">You can view your active packages any time from your Profile. Questions about this charge? Just reply to this email.</p>
      </div>
    `,
  });
};

module.exports = { sendPasswordResetEmail, sendPaymentReceiptEmail };
