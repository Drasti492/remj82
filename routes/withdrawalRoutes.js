const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Withdrawal = require("../models/Withdrawal");

// ===============================
// REQUEST WITHDRAWAL (PENDING)
// ===============================
router.post("/withdraw", auth, async (req, res) => {
  try {
    const user = req.user;

    // 🔐 HARD SECURITY CHECK
    if (!user.isManuallyVerified) {
      return res.status(403).json({
        message: "Account not verified for withdrawals"
      });
    }

    const { amount, paymentMethod, paymentAddress } = req.body;

    if (!amount || amount < 12) {
      return res.status(400).json({ message: "Minimum withdrawal is $12" });
    }

    if (amount > user.balance) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // 📝 SAVE AS PENDING (DO NOT TOUCH BALANCE)
    await Withdrawal.create({
      user: user._id,
      amount,
      method: paymentMethod,
      address: paymentAddress,
      status: "pending"
    });

    return res.json({
      message: "Withdrawal request submitted and pending approval"
    });

  } catch (error) {
    console.error("Withdrawal error:", error);
    res.status(500).json({ message: "Withdrawal failed" });
  }
});

module.exports = router;
