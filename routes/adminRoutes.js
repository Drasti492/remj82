const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Notification = require("../models/notification");

// ✅ Admin manually verifies user
router.post("/verify-user/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });

    // Manual verification
    user.isManuallyVerified = true;  // Admin verified
    user.verified = true;            // Ensure verified flag is true
    // Connects remain as they were unless admin wants to allocate
    await user.save();

    // Optional: send a notification that the account is verified
    await Notification.create({
      user: user._id,
      title: "Account Verified",
      message: "Your account has been  verified . You can now apply for jobs if you have connects.",
      type: "info",
      read: false
    });

    res.json({ message: `${email} has been  verified.`, user });

  } catch (error) {
    console.error("Admin verify-user error:", error);
    res.status(500).json({ message: "Failed to verify user" });
  }
});

module.exports = router;
