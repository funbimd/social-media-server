const nodemailer = require("nodemailer");

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {String} options.to - Recipient email
 * @param {String} options.subject - Email subject
 * @param {String} options.text - Plain text version of email
 * @param {String} options.html - HTML version of email
 */
const sendEmail = async (options) => {
  // Create a transporter
  // For production, use a real email service
  const transporter =
    process.env.NODE_ENV === "production"
      ? nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD,
          },
        })
      : nodemailer.createTransport({
          host: "smtp.ethereal.email", // For development/testing
          port: 587,
          secure: false,
          auth: {
            user: "brayan.littel56@ethereal.email",
            pass: "XKsJd5cns7rPD5fAQC",
          },
        });

  // Define email options
  const mailOptions = {
    from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html || undefined,
  };

  // Send email
  const info = await transporter.sendMail(mailOptions);

  console.log(`Email sent: ${info.messageId}`);

  return info;
};

module.exports = sendEmail;
