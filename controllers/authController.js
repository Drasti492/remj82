require("dotenv").config();
const User = require("../models/user");
const Notification = require("../models/notification");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");

// ===== REGISTER =====
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered." });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Send verification email
    try {
      await sendEmail(email, "Verify Your Email", `
        <h3>Email Verification</h3>
        <p>Your verification code is: <strong>${code}</strong></p>
        <p>This code will expire in 10 minutes.</p>
      `);
    } catch (err) {
      console.error("Email sending error:", err);
      return res.status(500).json({ message: "Failed to send email.", error: err.message });
    }

    const user = new User({ name, email, phone, password });
    user.verificationCode = code;
    user.verificationCodeExpire = Date.now() + 10 * 60 * 1000; // 10 mins
    await user.save();

    // Welcome notification
    await Notification.create({
      user: user._id,
      title: "Welcome to JobHub!",
      message: "Your account has been created. Buy or receive connects anytime to start applying for jobs!",
      type: "info",
      read: false
    });

    res.status(201).json({ message: "Registration successful. Please verify your email." });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error during registration.", error: err.message });
  }
};

// ===== LOGIN =====
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ message: "Incorrect email or password." });
    }

    if (!user.verified) {
      return res.status(400).json({ message: "Your email has not been verified." });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ message: "Login successful", token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error during login." });
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

    if (!user) {
      return res.json({ message: "If this email is registered, a reset code has been sent." });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetCode = code;
    user.resetCodeExpire = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendEmail(email, "Password Reset Code", `
      <h3>Reset Your Password</h3>
      <p>Your reset code is: <strong>${code}</strong></p>
      <p>This code will expire in 10 minutes.</p>
    `);

    res.json({ message: "If this email is registered, a reset code has been sent." });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Server error while processing request." });
  }
};

// ===== RESET PASSWORD =====
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "No account found with this email." });
    if (!user.resetCode || !user.resetCodeExpire) return res.status(400).json({ message: "No reset request found." });
    if (Date.now() > user.resetCodeExpire) return res.status(400).json({ message: "Reset code expired." });
    if (user.resetCode !== code) return res.status(400).json({ message: "Invalid reset code." });

    user.password = newPassword;
    user.resetCode = undefined;
    user.resetCodeExpire = undefined;
    user.verified = true;
    await user.save();

    res.json({ message: "Password reset successful. You can now log in." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Server error while resetting password." });
  }
};

// ===== VERIFY EMAIL CODE =====
exports.verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "Account not found." });
    if (!user.verificationCodeExpire || Date.now() >= Number(user.verificationCodeExpire)) {
      return res.status(400).json({ message: "Verification code expired." });
    }
    if (user.verificationCode !== code) return res.status(400).json({ message: "Invalid verification code." });

    user.verified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpire = undefined;
    await user.save();

    res.json({ message: "Email verified successfully." });
  } catch (err) {
    console.error("Verify code error:", err);
    res.status(500).json({ message: "Server error during email verification." });
  }
};

// ===== GET USER PROFILE =====
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "-password -verificationCode -verificationCodeExpire -resetCode -resetCodeExpire"
    );

    if (!user) return res.status(404).json({ message: "User not found." });

    res.json({ success: true, user });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ message: "Server error while fetching user." });
  }
};

// ===== MANUALLY VERIFY USER =====
exports.verifyUserManually = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: "User not found." });

    user.verified = true;
    await user.save();

    res.json({ message: "User has been manually verified." });
  } catch (err) {
    console.error("Manual verify error:", err);
    res.status(500).json({ message: "Server error during manual verification." });
  }
};
