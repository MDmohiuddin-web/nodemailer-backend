const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;
require('dotenv').config();
const emailRoutes = require("./Routing/emailRoutes.js");
app.use(cors());
app.use(express.json());



 app.use("/email",emailRoutes, (req, res) => {
  res.send("email routes working");
});
app.get("/", (req, res) => {
  res.send("Sending Emails with Nodemailer API test!");
});
app.listen(port, () => {
  console.log(`Sending Emails with Nodemailer on port ${port}`);
});
