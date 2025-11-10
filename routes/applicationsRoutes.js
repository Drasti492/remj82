// routes/applicationsRoutes.js
const express = require("express");
const router = express.Router();
const Notification = require("../models/notification");
const auth = require("../middleware/auth");

// POST /api/applications/apply/:jobId
router.post("/apply/:jobId", auth, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { title, company, description } = req.body;
    const user = req.user;

    if (!title || !jobId) {
      return res.status(400).json({ message: "Job information is missing." });
    }

    // Ensure applications array exists
    if (!Array.isArray(user.applications)) user.applications = [];

    // Prevent duplicate
    const alreadyApplied = user.applications.some(app => app.jobId === jobId);
    if (alreadyApplied) {
      return res.status(400).json({ message: `You have already applied for ${title}.` });
    }

    const applicationsCount = user.applications.length;

    // Free applications for unverified users
    if (!user.isManuallyVerified && applicationsCount >= 3) {
      return res.status(403).json({
        message: "You’ve used your 3 free applications. Please buy connects to apply more."
      });
    }

    // Apply using free or connects
    if (!user.isManuallyVerified && applicationsCount < 3) {
      user.applications.push({ jobId, title, company, description });
    } else if (user.connects > 0) {
      user.connects -= 1;
      user.applications.push({ jobId, title, company, description });
    } else {
      return res.status(403).json({
        message: `You have no connects left. Please buy connects to apply for ${title}.`
      });
    }

    await user.save(); // Save changes

    // Create notification
await Notification.create({
  user: user._id,
  title: "Application Received",
  message: `Hello ${user.name}, your application for "${title}" has been received. Get connects to verify your account and be on top of the job applicants.`,
});


    res.json({
      message: `Application successful for "${title}"! Check your notifications for details.`,
      connectsRemaining: user.connects
    });
  } catch (err) {
    console.error("Apply error:", err.message);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
});

module.exports = router;
