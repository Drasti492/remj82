const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Notification = require("../models/notification");
const auth = require("../middleware/auth");

// @route   POST /api/applications/apply/:jobId
// @desc    Apply to a job
// @access  Private
router.post("/apply/:jobId", auth, async (req, res) => {
    try {
        const { jobId } = req.params;
        const { title, company, description } = req.body; // receive job info from frontend
        const user = req.user;

        if (!title || !jobId) {
            return res.status(400).json({ message: "Job information is missing." });
        }

        // Ensure applications array exists
        if (!Array.isArray(user.applications)) user.applications = [];

        // Prevent duplicate applications
        const alreadyApplied = user.applications.some(app => app.jobId === jobId);
        if (alreadyApplied) {
            return res.status(400).json({ message: `You have already applied for ${title}.` });
        }

        const applicationsCount = user.applications.length;

        // Handle free applications for unverified users
        if (!user.isManuallyVerified && applicationsCount >= 3) {
            return res.status(403).json({
                message: `You’ve used your 3 free applications. Only verified users can apply more. Please buy connects to apply more jobs.`
            });
        }

        // Apply using free applications or connects
        if (!user.isManuallyVerified && applicationsCount < 3) {
            user.applications.push({ jobId, title, company, description });
            await user.save();
        } else if (user.connects > 0) {
            user.connects -= 1;
            user.applications.push({ jobId, title, company, description });
            await user.save();
        } else {
            return res.status(403).json({
                message: `You have no connects left. Please buy connects to apply for ${title}.`
            });
        }

        // Create notification
        await Notification.create({
            user: user._id,
            sender: "RemoteProJobsSupport",
            title: "Job Application Successful",
            message: `You successfully applied for "${title}" at ${company}. Our support team will contact you if needed.`,
            read: false
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
