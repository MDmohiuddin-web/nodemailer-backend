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
  const { email, subject, message } = req.body;
  console.log(email, subject, message);

  try {
    const info = await transporter.sendMail({
      from: `"Your Company" <${process.env.EMAIL_USER}>`, // Corrected to access the environment variable
      to: email,
      subject: subject,
      text: message,
      html: `<p>${message}</p>`,
    });

    console.log("Message sent: %s", info.messageId);
    res.json({ status: "success", message: "Email sent successfully!" });

  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ status: "error", message: "Failed to send email." });
  }
});

module.exports = { sendEmail };
