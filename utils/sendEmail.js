const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, html) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SENDER_EMAIL,
        pass: process.env.EMAIL_PASS, // Gmail app password
      },
    });

    const mailOptions = {
      from: `"Glowey Cosmetics" <${process.env.SENDER_EMAIL}>`,
      to,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`📩 Email sent to ${to}`);
  } catch (err) {
    console.error("❌ Email sending error:", err.message);
    throw new Error("Email sending failed");
  }
};

module.exports = sendEmail;
