require("dotenv").config();
const User = require("../models/user");
const Notification = require("../models/notification");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");

// REGISTER
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

    await sendEmail(email, "Verify Your Email", `
      <h3>Welcome to RemoteProJobs</h3>
      <p>Your verification code is: <strong>${code}</strong></p>
      <p>Expires in 10 minutes.</p>
    `);

    const user = new User({ 
      name, email, phone, password,
      verified: false,
      isManuallyVerified: false
    });

    user.verificationCode = code;
    user.verificationCodeExpire = Date.now() + 10 * 60 * 1000;
    await user.save();

    await Notification.create({
      user: user._id,
      title: "Welcome!",
      message: "Your account is created. Wait for admin approval to get verified.",
      type: "info"
    });

    res.status(201).json({ message: "Registration successful. Please verify your email." });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// LOGIN — ONLY ONE FUNCTION ALLOWED
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ message: "Incorrect email or password." });
    }

    if (!user.isManuallyVerified) {
      return res.status(403).json({ 
        message: "Your account is pending admin approval. Please wait." 
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({ 
      message: "Login successful", 
      token,
      user: {
        name: user.name,
        email: user.email,
        isManuallyVerified: true
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// MANUAL VERIFY — ADMIN ONLY
exports.verifyUserManually = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: "User not found" });

    user.isManuallyVerified = true;
    await user.save();

    await Notification.create({
      user: user._id,
      title: "Account Verified!",
      message: "Congratulations! Your account is now fully verified.",
      type: "success"
    });

    res.json({ message: "User manually verified successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET USER PROFILE
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -verificationCode -resetCode");
    
    res.json({
      success: true,
      user: {
        ...user._doc,
        totalApplications: user.applications.length
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};