const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false, // MUST be false for 587
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false, // 🔥 REQUIRED on Render
  },
  connectionTimeout: 10000, // 10 seconds
});

const sendEmail = async (to, subject, html) => {
  await transporter.sendMail({
    from: "Fresh Mart <no-reply@freshmart.brevo>",
    to,
    subject,
    html,
  });

  console.log("📨 Email sent to:", to);
};

module.exports = sendEmail;
