require("dotenv").config();
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");

// ===== REGISTER =====
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "This email is already registered. Please log in instead." });
    }

    const user = new User({ name, email, password });
    await user.save();

    // Generate verification code (valid for 10 minutes)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationCode = code;
    user.verificationCodeExpire = Date.now() + 10 * 60 * 1000;
    await user.save();

    // Send verification email
    await sendEmail(
      email,
      "Verify Your Email",
      `<h3>Email Verification</h3>
       <p>Your verification code is: <strong>${code}</strong></p>
       <p>This code will expire in 10 minutes.</p>`
    );

    res.status(201).json({ message: "Registration successful. Please verify your email to continue." });
  } catch (err) {
    console.error("Register error:", err.message);
    res.status(500).json({ message: "We encountered a problem while processing your registration. Please try again later." });
  }
};

// ===== LOGIN =====
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ message: "Incorrect email or password. Please try again." });
    }

    if (!user.verified) {
      return res.status(400).json({ message: "Your email address has not been verified yet." });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ message: "Login successful", token });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ message: "We encountered a problem during login. Please try again later." });
  }
};

// ===== LOGOUT =====
exports.logout = (req, res) => {
  res.json({ message: "Logout successful" });
};

// ===== FORGOT PASSWORD =====
// ===== FORGOT PASSWORD =====
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      // Neutral message — doesn’t confirm existence of the account
      return res.json({ message: "If this email is registered, a reset code has been sent." });
    }

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

    res.json({ message: "If this email is registered, a reset code has been sent." });
  } catch (err) {
    console.error("Forgot password error:", err.message);
    res.status(500).json({ error: "Something went wrong while processing your request." });
  }
};


// ===== RESET PASSWORD =====
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "No account found with this email address." });
    }

    if (!user.resetCodeExpire || Date.now() >= Number(user.resetCodeExpire)) {
      return res.status(400).json({ message: "Your reset code has expired. Please request a new one." });
    }

    if (user.resetCode !== code) {
      return res.status(400).json({ message: "Invalid reset code. Please check and try again." });
    }

    user.password = newPassword;
    user.resetCode = undefined;
    user.resetCodeExpire = undefined;
    await user.save();

    res.json({ message: "Your password has been successfully reset." });
  } catch (err) {
    console.error("Reset password error:", err.message);
    res.status(500).json({ message: "We were unable to reset your password. Please try again later." });
  }
};

// ===== VERIFY EMAIL CODE =====
exports.verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "We couldn't find an account with this email address." });
    }

    if (!user.verificationCodeExpire || Date.now() >= Number(user.verificationCodeExpire)) {
      return res.status(400).json({ message: "Your verification code has expired. Please register again or request a new code." });
    }

    if (user.verificationCode !== code) {
      return res.status(400).json({ message: "Invalid verification code. Please check and try again." });
    }

    user.verified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpire = undefined;
    await user.save();

    res.json({ message: "Your email has been successfully verified." });
  } catch (err) {
    console.error("Verify code error:", err.message);
    res.status(500).json({ message: "We were unable to verify your email at this time. Please try again later." });
  }
};

module.exports = exports;
