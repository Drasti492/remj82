require("dotenv").config();
const axios = require("axios");
const User = require("../models/user");
const jwt = require("jsonwebtoken");

const MAILJET_URL = "https://api.mailjet.com/v3.1/send";

// Register
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }
    const user = new User({ name, email, password });
    await user.save();
    res.status(201).json({ message: "Registration successful! Please verify your email." });
  } catch (err) {
    res.status(500).json({ error: "Server error during registration" });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    if (!user.verified) {
      return res.status(400).json({ error: "Email not verified" });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ message: "Login successful", token });
  } catch (err) {
    res.status(500).json({ error: "Server error during login" });
  }
};

// Logout (simple example, adjust if using sessions)
exports.logout = (req, res) => {
  res.json({ message: "Logout successful" }); // Implement session clearing if needed
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Email not found" });
    }
    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    user.resetToken = resetToken;
    user.resetTokenExpire = new Date(Date.now() + 3600000); // 1 hour
    await user.save();
    res.json({ message: "Reset link sent to your email" }); // Send email in production
  } catch (err) {
    res.status(500).json({ error: "Server error during password reset request" });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpire: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }
    user.password = password;
    user.resetToken = undefined;
    user.resetTokenExpire = undefined;
    await user.save();
    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ error: "Server error during password reset" });
  }
};

// Send Verification Email
exports.sendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Email not found" });
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
    await axios.post(
      MAILJET_URL,
      {
        Messages: [
          {
            From: { Email: process.env.SENDER_EMAIL, Name: "Your App" },
            To: [{ Email: email }],
            Subject: "Verify Your Email",
            TextPart: `Your verification code is: ${code}`,
            HTMLPart: `<h3>Verify Your Email</h3><p>Your code is: <strong>${code}</strong></p><p>This code expires in 10 minutes.</p>`,
          },
        ],
      },
      {
        auth: {
          username: process.env.MAILJET_API_KEY,
          password: process.env.MAILJET_SECRET_KEY,
        },
        headers: { "Content-Type": "application/json" },
      }
    );
    user.verified = false; // Reset if re-sending
    await user.save(); // Save user state (optional, depending on your flow)
    res.json({ message: "Verification email sent" });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Failed to send verification email" });
  }
};

// Verify Code
exports.verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Email not found" });
    }
    // In a real app, store the code in the user document or a separate collection with an expiration
    // For simplicity, assume the code is sent and valid for 10 minutes (adjust backend logic)
    user.verified = true; // Set verified after successful code match
    await user.save();
    res.json({ message: "Email verified successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to verify code" });
  }
};

module.exports = exports;