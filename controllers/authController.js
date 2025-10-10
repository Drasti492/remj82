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

// Forgot Password (send code)
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Email not found" });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetCode = code;
    user.resetCodeExpire = Date.now() + 10 * 60 * 1000; // 10 min
    await user.save();

    await axios.post(
      MAILJET_URL,
      {
        Messages: [
          {
            From: { Email: process.env.SENDER_EMAIL, Name: "Your App" },
            To: [{ Email: email }],
            Subject: "Password Reset Code",
            HTMLPart: `<h3>Reset Your Password</h3><p>Your code is: <strong>${code}</strong></p><p>This code expires in 10 minutes.</p>`,
          },
        ],
      },
      {
        auth: {
          username: process.env.MAILJET_API_KEY,
          password: process.env.MAILJET_SECRET_KEY,
        },
      }
    );

    res.json({ message: "Reset code sent to your email" });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Failed to send reset code" });
  }
};

// Reset Password (verify code)
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });

    if (user.resetCode !== code || Date.now() > user.resetCodeExpire) {
      return res.status(400).json({ error: "Invalid or expired reset code" });
    }

    user.password = newPassword;
    user.resetCode = undefined;
    user.resetCodeExpire = undefined;
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
    if (!user) return res.status(400).json({ error: "Email not found" });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationCode = code;
    user.verificationCodeExpire = Date.now() + 10 * 60 * 1000; // expires in 10 min
    await user.save();

    await axios.post(
      MAILJET_URL,
      {
        Messages: [
          {
            From: { Email: process.env.SENDER_EMAIL, Name: "Your App" },
            To: [{ Email: email }],
            Subject: "Verify Your Email",
            HTMLPart: `<h3>Verify Your Email</h3><p>Your code is: <strong>${code}</strong></p><p>This code expires in 10 minutes.</p>`,
          },
        ],
      },
      {
        auth: {
          username: process.env.MAILJET_API_KEY,
          password: process.env.MAILJET_SECRET_KEY,
        },
      }
    );

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
    if (!user) return res.status(400).json({ error: "Email not found" });

    if (
      user.verificationCode !== code ||
      Date.now() > user.verificationCodeExpire
    ) {
      return res.status(400).json({ error: "Invalid or expired code" });
    }

    user.verified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpire = undefined;
    await user.save();

    res.json({ message: "Email verified successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to verify code" });
  }
};


module.exports = exports;