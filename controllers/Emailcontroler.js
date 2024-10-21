require("dotenv").config();
const expressAsyncHandler = require("express-async-handler");
const { MongoClient, ServerApiVersion } = require("mongodb");
const nodemailer = require("nodemailer");

const uri = `mongodb+srv://${encodeURIComponent(process.env.DB_USER)}:${encodeURIComponent(process.env.BD_PASS)}@cluster0.cg8xo0z.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function connectToDatabase() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
}

const db = client.db("smtpmailsystem");
const userCollection = db.collection("users");
const studentCollection = db.collection("student");
const emailSendCollection = db.collection("email_send");

let transporter = nodemailer.createTransport({
  host: process.env.HOST_NAME,
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = expressAsyncHandler(async (req, res) => {
  const { collection, subject, message } = req.body;
  console.log("Request Body:", req.body);
  try {
    await connectToDatabase();

    let recipients;
    if (collection === "users") {
      recipients = await userCollection.find({}).toArray();
    } else if (collection === "student") {
      recipients = await studentCollection.find({}).toArray();
    } else {
      throw new Error("Invalid collection type");
    }

    console.log("Recipients:", recipients);

    const recipientEmails = recipients.map((recipient) => recipient.email);

    const promises = recipientEmails.map((email) => {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: subject,
        text: message,
      };

      return transporter.sendMail(mailOptions);
    });

    await Promise.all(promises);

    await emailSendCollection.insertOne({
      sender: process.env.EMAIL_USER,
      recipients: recipientEmails,
      subject: subject,
      message: message,
      sentAt: new Date(),
     
    });

    res.json({ status: "success", message: "Email sent successfully!" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ status: "error", message: "Failed to send email.", error: error.message });
  } finally {
    await client.close();
  }
});

module.exports = { sendEmail };
 