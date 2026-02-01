const nodemailer = require("nodemailer");

function smtpConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS);
}

async function sendVerificationEmail(to, code) {
  if (!smtpConfigured()) return false;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });

  const from = process.env.SMTP_FROM || "no-reply@svsu.edu";

  await transporter.sendMail({
    from,
    to,
    subject: "SVSU AI Hub verification code",
    text: `Your verification code is: ${code}

This code expires in 15 minutes.`
  });

  return true;
}

module.exports = { smtpConfigured, sendVerificationEmail };
