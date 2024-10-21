require('dotenv').config();
const expressAsyncHandler = require("express-async-handler");
const nodemailer = require("nodemailer");
let transporter = nodemailer.createTransport({
  host:process.env.HOST_NAME,
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {         
    user:process.env.EMAIL_USER, // generated ethereal user
    pass:process.env.EMAIL_PASS, // generated ethereal password
  },
});

const sendEmail = expressAsyncHandler(async (req, res) => {
  const { emails,name, subject, message } = req.body;
  console.log(emails, subject, message);

  try {
    const info = await transporter.sendMail({
      from: `${name}<${process.env.EMAIL_USER}>`, // Corrected to access the environment variable
      to: emails,
      subject: subject,
      text: message,
      
    });

    console.log("Message sent: %s", info.messageId);
    res.json({ status: "success", message: "Email sent successfully!" });

  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ status: "error", message: "Failed to send email." });
  }
});

module.exports = { sendEmail };
