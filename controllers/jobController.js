const User = require("../models/user");

exports.applyJob = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Check connects ONLY — not verification
    if (user.connects <= 0) {
      return res.status(400).json({
        message: "You currently don't have connects to apply for this job."
      });
    }

    user.connects -= 1;
    user.applications += 1;

    await user.save();

    res.json({ success: true, message: "Application submitted successfully." });

  } catch (err) {
    console.error("Apply job error:", err.message);
    res.status(500).json({ message: "Server error while applying." });
  }
};
