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

    if (!title || !company || !jobId) {
      return res.status(400).json({
        success: false,
        message: "Job title, company, and jobId are required."
      });
    }

    // Already applied?
    const alreadyApplied = user.applications.some(a => a.jobId === jobId);
    if (alreadyApplied) {
      return res.status(200).json({
        success: false,
        alreadyApplied: true,
        message: "You have already applied for this job."
      });
    }

    // Must have connects
    if (user.connects <= 0) {
      await Notification.create({
        user: user._id,
        title: "No Connects Available",
        message: "You currently don’t have enough connects to apply for this job.",
        type: "warning",
        read: false
      });
      return res.status(403).json({
        success: false,
        limitReached: true,
        message: "You don’t have enough connects to apply."
      });
    }

    // Deduct 1 connect
    user.connects -= 1;
    if (user.connects < 0) user.connects = 0;

    // Save application
    user.applications.push({
      jobId,
      title,
      company,
      description,
      appliedAt: new Date()
    });
    await user.save();

    // Success notification
    await Notification.create({
      user: user._id,
      title: "Application Submitted",
      message: `You successfully applied for "${title}" at ${company}.`,
      type: "success",
      read: false
    });

    return res.json({
      success: true,
      message: "Application submitted successfully!",
      connectsRemaining: user.connects
    });

  } catch (error) {
    console.error("Apply route error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to apply. Try again later."
    });
  }
});
