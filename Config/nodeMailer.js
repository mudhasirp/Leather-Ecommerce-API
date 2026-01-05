const axios = require("axios");

const sendEmail = async (to, subject, html) => {
  try {
    const res = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "Fresh mart",
          email: "mudhasirp9@gmail.com", // allowed by Brevo
        },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("📨 Email sent to:", to);
  } catch (err) {
    console.error(
      "❌ Brevo API email error:",
      err.response?.data || err.message
    );
    throw err;
  }
};

module.exports = sendEmail;
