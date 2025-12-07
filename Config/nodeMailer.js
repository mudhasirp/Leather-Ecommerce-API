const nodemailer = require("nodemailer");
//nodemailer for sending email
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,          
  port: process.env.SMTP_PORT || 465,
  secure: true,                         
  auth: {
    user: process.env.SMTP_USER,        
    pass: process.env.SMTP_PASS,        
  },
});

const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: `"Leather Haven 👜" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });

    console.log("📨 Mail sent to:", to);
  } catch (error) {
    console.error("❌ Email send failed:", error.message);
  }
};

module.exports = sendEmail;
