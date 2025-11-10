const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Notification = require("../models/notification");
const auth = require("../middleware/auth");

// Apply to a job
router.post("/apply/:jobId", auth, async (req, res) => {
  try {
    const { jobId } = req.params;
    const user = req.user;

    const applicationsCount = user.applications?.length || 0;

    // Unverified users can only apply max 3 times
    if (!user.isManuallyVerified && applicationsCount >= 3) {
      return res.status(403).json({
        message: "You reached the free application limit. Please buy connects to apply more jobs."
      });
    }

    // Check if user has connects if needed
    if (user.isManuallyVerified === false && applicationsCount < 3) {
      // Allow free applications
      user.applications.push(jobId);
      await user.save();
    } else if (user.connects > 0) {
      // Deduct a connect for verified users
      user.connects -= 1;
      user.applications.push(jobId);
      await user.save();
    } else {
      return res.status(403).json({
        message: "You have no connects left. Please buy connects to apply."
      });
    }

    // Create notification
    await Notification.create({
      user: user._id,
      sender: "RemoteProJobsSupport",
      title: "Job Application Successful",
      message: `You successfully applied for job ${jobId}. Our support team will contact you if needed.`,
      read: false
    });

    // Respond
    res.json({
      message: "✅ Application successful! Redirecting to your inbox...",
      connectsRemaining: user.connects
    });
  } catch (err) {
    console.error("Apply error:", err.message);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
});

module.exports = router;
