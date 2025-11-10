const express = require("express");
const router = express.Router();
const User = require("../models/user");

// ✅ Admin manually verifies user
router.post("/verify-user/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isManuallyVerified = true;
    user.connects = 9999; // practically unlimited
    await user.save();

    res.json({ message: `${email} is now manually verified with unlimited connects.` });
  } catch (error) {
    res.status(500).json({ message: "Failed to verify user manually" });
  }
});

module.exports = router;
