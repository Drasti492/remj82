const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Payment = require("../models/Payment");

// ===============================
// USER PAYMENT HISTORY
// ===============================
router.get("/my-payments", auth, async (req, res) => {
  const payments = await Payment.find({ user: req.user._id })
    .sort({ createdAt: -1 });

  res.json(payments);
});

module.exports = router;
