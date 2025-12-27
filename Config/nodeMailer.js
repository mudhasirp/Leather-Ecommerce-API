const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (to, subject, html) => {
  try {
    await resend.emails.send({
      from: "Leather Haven <onboarding@resend.dev>",
      to,
      subject,
      html,
    });

    console.log("📨 Email sent to:", to);
  } catch (error) {
    console.error("❌ Email send failed:", error);
    throw error;
  }
};

module.exports = sendEmail;
