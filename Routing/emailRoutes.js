const express = require("express");
const router = express.Router();

const { sendEmail } = require("../controllers/Emailcontroler.js");

router.post("/sendEmail", sendEmail );

module.exports = router;
