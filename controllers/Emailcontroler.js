require("dotenv").config();
const expressAsyncHandler = require("express-async-handler");
const { MongoClient, ServerApiVersion } = require("mongodb");
const nodemailer = require("nodemailer");
const imaps = require('imap-simple');

const uri = `mongodb+srv://${encodeURIComponent(process.env.DB_USER)}:${encodeURIComponent(process.env.DB_PASS)}@cluster0.cg8xo0z.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Function to connect to MongoDB
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
const studentsCollection = db.collection("students");
const emailSendCollection = db.collection("email_send");

// Nodemailer transporter setup
let transporter = nodemailer.createTransport({
  host: process.env.HOST_NAME,
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Function to send email to all users in the selected collection
const sendEmail = expressAsyncHandler(async (req, res) => {
  const { collection, subject, message } = req.body;
  console.log("Request Body:", req.body);
  try {
    await connectToDatabase();

    // Select the correct collection
    let recipients;
    if (collection === "users") {
      recipients = await userCollection.find({}).toArray();
    } else if (collection === "students") {
      recipients = await studentsCollection.find({}).toArray();
    } else {
      throw new Error("Invalid collection type");
    }

    console.log("Recipients:", recipients);

    // Map recipient emails
    const recipientEmails = recipients.map((recipient) => recipient.email);

    // Send email to each recipient
    const promises = recipientEmails.map(async (email) => {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: subject,
        text: message,
      };

      const info = await transporter.sendMail(mailOptions);
      return info;
    }); 
 
    const infoResults = await Promise.all(promises);
    const infoMessageId = infoResults.map(info => info.messageId);

    // Log email send details in the database
    await emailSendCollection.insertOne({
      sender: process.env.EMAIL_USER,
      recipients: recipientEmails,
      subject: subject,
      message: message,
      sentAt: new Date(),
      // messageId: infoMessageId,
    });

    res.json({ status: "success", message: "Email sent successfully!" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ status: "error", message: "Failed to send email.", error: error.message });
  } finally {
    await client.close();
  }
});

// IMAP configuration for fetching emails
const imapConfig = {
  imap: {
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASS,
    host: 'imap.gmail.com', // Change this based on your email provider
    port: 993,
    tls: true,
    authTimeout: 3000
  }
};

// Function to fetch emails using IMAP
const fetchEmails = expressAsyncHandler(async (req, res) => {
  try {
    const connection = await imaps.connect(imapConfig);
    await connection.openBox('INBOX');

    const searchCriteria = ['UNSEEN'];
    const fetchOptions = { bodies: ['HEADER', 'TEXT'], markSeen: true };

    const messages = await connection.search(searchCriteria, fetchOptions);
    const emails = [];

    messages.forEach(item => {
      const all = item.parts.find(part => part.which === 'TEXT');
      const id = item.attributes.uid;
      const idHeader = 'Imap-Id: ' + id + '\r\n';

      simpleParser(idHeader + all.body, (err, mail) => {
        if (err) return console.error(err);

        emails.push({
          from: mail.from.text,
          subject: mail.subject,
          text: mail.text,
          date: mail.date,
        });
      });
    });

    res.json({ status: "success", emails });
  } catch (error) {
    console.error("Error fetching emails:", error);
    res.status(500).json({ status: "error", message: "Failed to fetch emails.", error: error.message });
  }
});

module.exports = { sendEmail, fetchEmails };
