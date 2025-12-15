const express = require("express");
const router = express.Router();
const Withdrawal = require("../models/Withdrawal");
const User = require("../models/user");
const auth = require("../middleware/auth");

// 🔐 Admin check (simple)
function isAdmin(req, res, next) {
  if (!req.user.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

// ===============================
// GET ALL PENDING WITHDRAWALS
// ===============================
router.get("/withdrawals", auth, isAdmin, async (req, res) => {
  const withdrawals = await Withdrawal.find({ status: "pending" })
    .populate("user", "name email balance");

  res.json(withdrawals);
});

// ===============================
// APPROVE WITHDRAWAL
// ===============================
router.post("/withdrawals/:id/approve", auth, isAdmin, async (req, res) => {
  const withdrawal = await Withdrawal.findById(req.params.id);
  if (!withdrawal) return res.status(404).json({ message: "Not found" });

  if (withdrawal.status !== "pending") {
    return res.status(400).json({ message: "Already processed" });
  }

  const user = await User.findById(withdrawal.user);

  if (user.balance < withdrawal.amount) {
    return res.status(400).json({ message: "User balance changed" });
  }

  // 💰 Deduct balance
  user.balance -= withdrawal.amount;
  await user.save();

  withdrawal.status = "approved";
  await withdrawal.save();

  res.json({ message: "Withdrawal approved and balance updated" });
});

// ===============================
// REJECT WITHDRAWAL
// ===============================
router.post("/withdrawals/:id/reject", auth, isAdmin, async (req, res) => {
  const withdrawal = await Withdrawal.findById(req.params.id);
  if (!withdrawal) return res.status(404).json({ message: "Not found" });

  withdrawal.status = "rejected";
  await withdrawal.save();

  res.json({ message: "Withdrawal rejected" });
});

module.exports = router;
