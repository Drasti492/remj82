const User = require("../models/user");

module.exports = async function (req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // ✅ Admin-verified users have unlimited connects
    if (user.isManuallyVerified) {
      req.user = user;
      return next();
    }

    // ✅ Limit unverified users to 3 applications
    if (user.connects <= 0) {
      return res.status(403).json({
        message:
          "💡 You’ve reached your free limit of job applications. Please verify your account or buy connects to continue applying.",
        requiresUpgrade: true,
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("checkConnects error:", error.message);
    res.status(500).json({ message: "Error checking connects" });
  }
};
