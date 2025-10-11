// ===== RESET PASSWORD =====
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });

    if (user.resetCode !== code || Date.now() > user.resetCodeExpire) {
      return res.status(400).json({ error: "Invalid or expired reset code" });
    }

    user.password = newPassword;
    user.resetCode = undefined;
    user.resetCodeExpire = undefined;

    // ✅ Automatically verify the user after a successful reset
    user.verified = true;

    await user.save();

    res.json({ message: "Password reset successful. You can now log in." });
  } catch (err) {
    console.error("Reset password error:", err.message);
    res.status(500).json({ error: "Something went wrong while resetting password." });
  }
};
