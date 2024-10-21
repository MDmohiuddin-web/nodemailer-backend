const express = require("express");
const router = express.Router();

const { sendEmail } = require("../controllers/Emailcontroler.js");

router.post("/send-email", sendEmail );

module.exports = router;
