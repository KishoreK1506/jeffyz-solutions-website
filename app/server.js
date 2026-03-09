require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// ✅ Serve your website + assets
app.use(express.static(path.join(__dirname))); 
// or better: app.use(express.static(path.join(__dirname, "public")));

app.post("/send-email", async (req, res) => {
  const { name, email, message } = req.body;

  try {
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    await transporter.sendMail({
      from: email,
      to: process.env.EMAIL_USER,
      subject: "New Query from Website",
      text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`
    });

    res.json({ success: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false });
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));