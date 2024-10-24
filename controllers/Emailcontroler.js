require("dotenv").config();
const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const { MongoClient, ServerApiVersion } = require("mongodb");
const nodemailer = require("nodemailer");
const imaps = require("imap-simple");
const { simpleParser } = require("mailparser");

const uri = `mongodb+srv://${encodeURIComponent(
  process.env.DB_USER
)}:${encodeURIComponent(
  process.env.DB_PASS
)}@cluster0.cg8xo0z.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
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
const hostingCollection = db.collection("hosting");
const emailSendCollection = db.collection("email_send");
const emailRepliesCollection = db.collection("email_replies");

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
    const infoMessageId = infoResults.map((info) => info.messageId);
    console.log("infoMessageId:", infoMessageId);

    // Log email send details in the database
    await emailSendCollection.insertOne({
      sender: process.env.EMAIL_USER,
      recipients: recipientEmails,
      subject: subject,
      message: message,
      sentAt: new Date(),
      messageId: infoMessageId,
    });
    console.log("Email sent successfully!");

    res.json({ status: "success", message: "Email sent successfully!" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to send email.",
      error: error.message,
    });
  } finally {
    await client.close();
  }
});

// IMAP configuration for fetching emails
const imapConfig = {
  imap: {
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASS,
    host: "imap.gmail.com",
    port: 993,
    tls: true,
    authTimeout: 3000,
    tlsOptions: { rejectUnauthorized: false },
  },
};

// Function to fetch emails using IMAP and store replies in MongoDB
const fetchEmails = expressAsyncHandler(async (req, res) => {
  try {
    await connectToDatabase();
    const connection = await imaps.connect(imapConfig);
    const inbox = await connection.openBox("INBOX");

    // Search for unread messages that are replies
    const searchCriteria = ["UNSEEN", ["HEADER", "In-Reply-To", ""]];
    const fetchOptions = {
      bodies: ["HEADER", "TEXT", ""],
      markSeen: true,
    };

    const messages = await connection.search(searchCriteria, fetchOptions);
    const emails = [];

    for (const item of messages) {
      const all = item.parts.find((part) => part.which === "");
      const id = item.attributes.uid;
      const idHeader = "Imap-Id: " + id + "\r\n";

      const parsed = await simpleParser(idHeader + all.body);

      // Check if this is a reply to an existing email
      const originalEmail = await emailSendCollection.findOne({
        messageId: { $in: [parsed.inReplyTo] },
      });

      const emailData = [{
        from: parsed.from.text,
        to: parsed.to.text,
        subject: parsed.subject,
        text: parsed.text,
        date: parsed.date,
        messageId: parsed.messageId,
        inReplyTo: parsed.inReplyTo,
        references: parsed.references,
        originalEmailId: originalEmail ? originalEmail._id : null,
        receivedAt: new Date(),
      }];

      emails.push(...emailData);

      // Store email reply in MongoDB
      await emailRepliesCollection.insertOne(emailData[0]);
    }

    await connection.end();
    res.json(emails);

  } catch (error) {
    console.error("Error fetching emails:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch emails.",
      error: error.message,
    });
  } finally {
    await client.close();
  }
});
// Get all email replies from database
const getEmailReplies = expressAsyncHandler(async (req, res) => {
  try {
    await connectToDatabase();
    const replies = await emailRepliesCollection
      .find({})
      .sort({ receivedAt: -1 })
      .toArray();

    res.json(replies);
  } catch (error) {
    console.error("Error fetching email replies:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch email replies.",
      error: error.message,
    });
  } finally {
    await client.close();
  }
});

module.exports = { sendEmail, fetchEmails, getEmailReplies };
