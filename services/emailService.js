// Render blocks outbound raw SMTP connections outright (confirmed live:
// connecting to smtp.gmail.com:587 times out every time in production,
// while the exact same code sends instantly from a normal machine — no
// amount of IPv4/timeout tuning fixes a blocked port). Resend's API sends
// over plain HTTPS instead of an SMTP socket, which sidesteps that
// restriction entirely. `RESEND_FROM` overrides the sandbox sender once a
// domain is verified in the Resend dashboard; until then the sandbox
// address only actually delivers to the account's own signup email, though
// the API call itself still succeeds for any recipient.
const RESEND_FROM = process.env.RESEND_FROM || "Fitness Zone <onboarding@resend.dev>";
// The templates invite a reply ("Questions about this charge? Just reply
// to this email") — `noreply@fitnesszone.ltd` can send but nothing reads
// it, so replies are routed to the real inbox that's actually monitored.
const REPLY_TO = process.env.EMAIL_REPLY_TO || "fitnesszoneofficial.uk26@gmail.com";

const sendEmail = async ({ to, subject, html }) => {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to,
      subject,
      html,
      reply_to: REPLY_TO,
    }),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Resend API error (${res.status}): ${errBody}`);
  }
};

const BRAND_BLUE = "#12224A";
const BRAND_BLUE_PALE = "#EAF1FF";
const BRAND_ORANGE = "#F76B1C";
const FONT_STACK =
  "'Segoe UI', Helvetica, Arial, sans-serif";

// Shared chrome (header wordmark + footer) around every email, matching the
// site's own footer copy so the two feel like the same product. Built with
// tables/inline styles throughout — the only markup that renders reliably
// across Gmail, Outlook, and Apple Mail.
const wrapEmail = (bodyHtml) => `
  <div style="background:#F4F6FB; padding:32px 16px; font-family:${FONT_STACK};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:14px; overflow:hidden; border:1px solid #e6ebf5;">
      <tr>
        <td style="background:${BRAND_BLUE}; padding:26px 32px; text-align:center;">
          <span style="font-size:20px; font-weight:800; letter-spacing:1px; color:#ffffff;">
            FITNESS <span style="color:${BRAND_ORANGE};">ZONE</span>
          </span>
        </td>
      </tr>
      <tr>
        <td style="padding:36px 32px 8px;">
          ${bodyHtml}
        </td>
      </tr>
      <tr>
        <td style="background:${BRAND_BLUE}; padding:24px 32px; text-align:center;">
          <p style="margin:0 0 6px; color:#ffffff; font-size:13px; font-weight:700; letter-spacing:0.3px;">
            FITNESS <span style="color:${BRAND_ORANGE};">ZONE</span>
          </p>
          <p style="margin:0 0 10px; color:rgba(255,255,255,0.55); font-size:11px; line-height:1.6;">
            Director / Founder: M Abu Bakar Siddique<br />
            Office 20790, 182–184 High Street North, London, United Kingdom, E6 2JA
          </p>
          <p style="margin:0; color:rgba(255,255,255,0.4); font-size:11px;">
            © ${new Date().getFullYear()} Fitness Zone. All rights reserved.
          </p>
        </td>
      </tr>
    </table>
  </div>
`;

const ctaButton = (label, url) => `
  <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:24px auto;">
    <tr>
      <td style="background:${BRAND_ORANGE}; border-radius:999px;">
        <a href="${url}" style="display:inline-block; padding:14px 36px; color:#ffffff; font-size:15px; font-weight:700; text-decoration:none; border-radius:999px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>
`;

// `display:inline-flex` centering (align-items/justify-content) is silently
// dropped by several mobile mail clients (notably the Gmail Android/iOS
// app's stripped-down renderer), leaving the emoji stuck in a corner of an
// unsized box. A table cell with real `align`/`valign` HTML attributes is
// the one centering method every mail client — including those — honors.
const iconCircle = (emoji, bg, color = "inherit") => `
  <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 22px;">
    <tr>
      <td width="52" height="52" align="center" valign="middle" style="width:52px; height:52px; background:${bg}; border-radius:50%; font-size:24px; color:${color};">
        ${emoji}
      </td>
    </tr>
  </table>
`;

const sendPasswordResetEmail = async (toEmail, resetUrl) => {
  const body = `
    ${iconCircle("🔒", BRAND_BLUE_PALE)}
    <h1 style="margin:0 0 14px; color:${BRAND_BLUE}; font-size:22px; font-weight:800; text-align:center;">
      Reset your password
    </h1>
    <p style="margin:0 0 4px; color:#495468; font-size:15px; line-height:1.65; text-align:center;">
      We received a request to reset the password for your Fitness Zone
      account. Click the button below to choose a new one.
    </p>
    <p style="margin:12px 0 0; color:#8b93a7; font-size:13px; text-align:center;">
      This link expires in <strong style="color:${BRAND_BLUE};">5 minutes</strong>.
    </p>

    ${ctaButton("Reset Password", resetUrl)}

    <p style="margin:8px 0 0; color:#8b93a7; font-size:12px; text-align:center; line-height:1.6;">
      Button not working? Copy and paste this link into your browser:
    </p>
    <p style="margin:6px 0 24px; padding:10px 14px; background:#f7f8fb; border-radius:8px; color:${BRAND_BLUE}; font-size:12px; word-break:break-all; text-align:center;">
      ${resetUrl}
    </p>

    <div style="background:${BRAND_BLUE_PALE}; border-radius:10px; padding:14px 18px; margin-bottom:8px;">
      <p style="margin:0; color:${BRAND_BLUE}; font-size:12.5px; line-height:1.6;">
        Didn't request this? No action needed — your password stays the same
        unless you click the link above.
      </p>
    </div>
  `;

  await sendEmail({
    to: toEmail,
    subject: "Reset your Fitness Zone password",
    html: wrapEmail(body),
  });
};

const sendPaymentReceiptEmail = async (
  toEmail,
  { items, total, paidAt, clientName, invoiceNumber },
) => {
  const rows = items
    .map(
      (item, i) => `
        <tr>
          <td style="padding:12px 0; border-bottom:1px solid #eef2fa; color:${BRAND_BLUE}; font-size:14px; ${i === 0 ? "padding-top:0;" : ""}">
            ${item.name}
          </td>
          <td style="padding:12px 0; border-bottom:1px solid #eef2fa; color:${BRAND_BLUE}; font-size:14px; text-align:right; white-space:nowrap; ${i === 0 ? "padding-top:0;" : ""}">
            ₹${item.amount.toLocaleString("en-IN")}
          </td>
        </tr>`,
    )
    .join("");

  const body = `
    ${iconCircle("✓", "#e8f8ee", "#1f9d55")}
    <h1 style="margin:0 0 8px; color:${BRAND_BLUE}; font-size:22px; font-weight:800; text-align:center;">
      Payment received — thank you!
    </h1>
    <p style="margin:0 0 26px; color:#8b93a7; font-size:13.5px; text-align:center;">
      ${clientName ? `Hi ${clientName}, here` : "Here"}'s your receipt.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eef2fa; border-radius:12px; padding:20px 22px; margin-bottom:8px;">
      <tr>
        <td colspan="2" style="padding-bottom:14px;">
          ${
            invoiceNumber
              ? `<span style="display:block; color:${BRAND_BLUE}; font-size:13px; font-weight:700; margin-bottom:3px;">Invoice #${invoiceNumber}</span>`
              : ""
          }
          <span style="color:#8b93a7; font-size:12px; text-transform:uppercase; letter-spacing:0.4px;">
            Paid on ${new Date(paidAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </span>
        </td>
      </tr>
      ${rows}
      <tr>
        <td style="padding:16px 0 0; color:${BRAND_BLUE}; font-size:15px; font-weight:800;">
          Total
        </td>
        <td style="padding:16px 0 0; color:${BRAND_BLUE}; font-size:15px; font-weight:800; text-align:right;">
          ₹${total.toLocaleString("en-IN")}
        </td>
      </tr>
    </table>

    ${ctaButton("View in Your Profile", `${process.env.CLIENT_URL}/client`)}

    <p style="margin:8px 0 24px; color:#8b93a7; font-size:12.5px; text-align:center; line-height:1.6;">
      Keep this email as your receipt. Questions about this charge? Just
      reply to this email and we'll help.
    </p>
  `;

  await sendEmail({
    to: toEmail,
    subject: "Your Fitness Zone payment receipt",
    html: wrapEmail(body),
  });
};

module.exports = { sendPasswordResetEmail, sendPaymentReceiptEmail };
