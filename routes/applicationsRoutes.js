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

    // -----------------------
    if (!title || !company || !jobId) {
      return res.status(400).json({
        success: false,
        message: "Job title, company, and jobId are required."
      });
    }

    // -----------------------
    //  Prevent duplicate applications
    // -----------------------
    const alreadyApplied = user.applications.some(a => a.jobId === jobId);

    if (alreadyApplied) {
      // Notify user (non-blocking, but useful)
      await Notification.create({
        user: user._id,
        title: "Already Applied",
        message: `You already applied for "${title}" at ${company}.`,
        type: "info",
        read: false
      });

      return res.status(200).json({
        success: false,
        alreadyApplied: true,
        message: "You have already applied for this job."
      });
    }

    // -----------------------
    // 🔍 Connects validation
    // -----------------------
    if (user.connects <= 0) {
      await Notification.create({
        user: user._id,
        title: "No Connects Remaining",
        message: "You don’t have enough connects to apply for this job.",
        type: "warning",
        read: false
      });

      return res.status(403).json({
        success: false,
        limitReached: true,
        message: "You don’t have enough connects to apply."
      });
    }

    // -----------------------
    // ➖ Deduct 1 connect
    // -----------------------
    user.connects -= 1;
    if (user.connects < 0) user.connects = 0;

    // -----------------------
    // 💾 Save application
    // -----------------------
    user.applications.push({
      jobId,
      title,
      company,
      description: description || "",
      appliedAt: new Date()
    });

    await user.save();

    // -----------------------
    // 🔔 Create success notification
    // -----------------------
    await Notification.create({
      user: user._id,
      title: "Application Submitted",
      message: `You successfully applied for "${title}" at ${company}.`,
      type: "success",
      read: false
    });

    // -----------------------
    // ✅ Final response
    // -----------------------
    return res.json({
      success: true,
      message: "Application submitted successfully!",
      connectsRemaining: user.connects
    });

  } catch (error) {
    console.error("Apply route error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to process application. Try again later."
    });
  }
});

module.exports = router;
