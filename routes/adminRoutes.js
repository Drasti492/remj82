const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

const User = require("../models/user");
const Payment = require("../models/Payment");

// ===============================
// GET ALL USERS
// ===============================
router.get("/users", auth, admin, async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
});

// ===============================
// GET ALL PAYMENTS
// ===============================
router.get("/payments", auth, admin, async (req, res) => {
  const payments = await Payment.find()
    .populate("user", "email phone")
    .sort({ createdAt: -1 });

  res.json(payments);
});

// ===============================
// MANUALLY ADJUST CONNECTS
// ===============================
router.post("/adjust-connects", auth, admin, async (req, res) => {
  const { userId, amount } = req.body;

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.connects += amount;
  await user.save();

  res.json({ message: "Connects updated", connects: user.connects });
});

module.exports = router;
