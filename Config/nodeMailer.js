const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false, 
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS,
  },
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
