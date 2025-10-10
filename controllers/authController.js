require("dotenv").config();
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail"); // ✅ import nodemailer helper

// ===== REGISTER =====
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const user = new User({ name, email, password });
    await user.save();

    // Generate verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationCode = code;
    user.verificationCodeExpire = Date.now() + 10 * 60 * 1000;
    await user.save();

    // Send verification email
    await sendEmail(
      email,
      "Verify Your Email",
      `<h3>Verify Your Email</h3>
       <p>Your code is: <strong>${code}</strong></p>
       <p>This code expires in 10 minutes.</p>`
    );

    res.status(201).json({ message: "Registration successful! Please verify your email." });
  } catch (err) {
    console.error("❌ Register error:", err.message);
    res.status(500).json({ error: "Server error during registration" });
  }
};

// ===== LOGIN =====
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
    console.error("❌ Login error:", err.message);
    res.status(500).json({ error: "Server error during login" });
  }
};

// ===== LOGOUT =====
exports.logout = (req, res) => {
  res.json({ message: "Logout successful" });
};

// ===== FORGOT PASSWORD =====
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Email not found" });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetCode = code;
    user.resetCodeExpire = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendEmail(
      email,
      "Password Reset Code",
      `<h3>Reset Your Password</h3>
       <p>Your reset code is: <strong>${code}</strong></p>
       <p>This code expires in 10 minutes.</p>`
    );

    res.json({ message: "Reset code sent to your email" });
  } catch (err) {
    console.error("❌ Forgot password error:", err.message);
    res.status(500).json({ error: "Failed to send reset code" });
  }
};

// ===== RESET PASSWORD =====
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
    console.error("❌ Reset password error:", err.message);
    res.status(500).json({ error: "Server error during password reset" });
  }
};

// ===== VERIFY CODE =====
exports.verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Email not found" });

    if (user.verificationCode !== code || Date.now() > user.verificationCodeExpire) {
      return res.status(400).json({ error: "Invalid or expired code" });
    }

    user.verified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpire = undefined;
    await user.save();

    res.json({ message: "Email verified successfully" });
  } catch (err) {
    console.error("❌ Verify code error:", err.message);
    res.status(500).json({ error: "Failed to verify code" });
  }
};

module.exports = exports;
