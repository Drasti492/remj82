require("dotenv").config();
const User = require("../models/user");
const Notification = require("../models/notification");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");

// ===============================
// HELPERS
// ===============================
const isStrongPassword = (password) => {
  // Example valid: A258100b
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;
  return regex.test(password);
};

const isValidPhone = (phone) => {
  return /^\+?[0-9]{8,15}$/.test(phone);
};

// ===============================
// REGISTER
// ===============================
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters and include uppercase, lowercase, and a number."
      });
    }

    if (!isValidPhone(phone)) {
      return res.status(400).json({
        message: "Phone number must be numeric and 8–15 digits."
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered." });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await sendEmail(
      email,
      "Verify Your Email",
      `
      <h3>Email Verification</h3>
      <p>Your verification code is:</p>
      <h2>${code}</h2>
      <p>This code expires in 10 minutes.</p>
    `
    );

    const user = await User.create({
      name,
      email,
      phone,
      password,
      verificationCode: code,
      verificationCodeExpire: Date.now() + 10 * 60 * 1000,
      verified: false
    });

    await Notification.create({
      user: user._id,
      title: "Welcome to Remote Pro Jobs",
      message:
        "Your account has been created successfully. Verify your email to start applying for jobs.",
      read: false
    });

    res.status(201).json({
      message: "Registration successful. Please verify your email.",
      email: user.email // ⭐ frontend stores this
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error during registration." });
  }
};

// ===============================
// LOGIN
// ===============================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ message: "Incorrect email or password." });
    }

    if (!user.verified) {
      return res.status(403).json({ message: "Please verify your email first." });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ message: "Login successful", token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error during login." });
  }
};

// ===============================
// VERIFY EMAIL CODE
// ===============================
exports.verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "Account not found." });
    if (user.verified) return res.json({ message: "Email already verified." });

    if (
      !user.verificationCode ||
      Date.now() > user.verificationCodeExpire
    ) {
      return res.status(400).json({ message: "Verification code expired." });
    }

    if (user.verificationCode !== code) {
      return res.status(400).json({ message: "Invalid verification code." });
    }

    user.verified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpire = undefined;
    await user.save();

    res.json({ message: "Email verified successfully." });
  } catch (err) {
    console.error("Verify error:", err);
    res.status(500).json({ message: "Server error during verification." });
  }
};

// ===============================
// RESEND VERIFICATION CODE
// ===============================
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "Account not found." });
    if (user.verified)
      return res.json({ message: "Email already verified." });

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    user.verificationCode = code;
    user.verificationCodeExpire = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendEmail(
      email,
      "Your New Verification Code",
      `<h2>${code}</h2><p>This code expires in 10 minutes.</p>`
    );

    res.json({ message: "Verification code resent." });
  } catch (err) {
    console.error("Resend error:", err);
    res.status(500).json({ message: "Server error while resending code." });
  }
};

// ===============================
// GET USER
// ===============================
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
};
