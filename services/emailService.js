// Uses Resend's HTTP API (https://resend.com) instead of raw SMTP — SMTP ports
// get blocked/timed out on some hosts (Render included), while a plain HTTPS
// request never does.
const RESEND_API_URL = "https://api.resend.com/emails";
const FROM_ADDRESS = process.env.EMAIL_FROM || "Fitness Zone <onboarding@resend.dev>";

const sendEmail = async ({ to, subject, html }) => {
  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Resend API error (${res.status}): ${errBody}`);
  }
};

const sendPasswordResetEmail = async (toEmail, resetUrl) => {
  await sendEmail({
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

  await sendEmail({
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
