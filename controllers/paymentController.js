const axios = require("axios");
const User = require("../models/user");

const PAYMENT_AMOUNT_KES = 1340;
const CONNECTS_GRANTED = 8;
const VERIFICATION_DAYS = 30;

exports.stkPush = async (req, res) => {
  try {
    let { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    // Normalize phone
    phone = phone.replace(/\s+/g, "");
    if (phone.startsWith("0")) phone = "254" + phone.slice(1);

    if (!/^2547\d{8}$/.test(phone)) {
      return res.status(400).json({ message: "Invalid phone number format" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent double active payment
    if (user.verifiedUntil && user.verifiedUntil > new Date()) {
      return res.status(400).json({
        message: "Your premium access is still active"
      });
    }

    console.log("📲 Initiating STK Push:", {
      phone,
      amount: PAYMENT_AMOUNT_KES,
      channel: process.env.PAYHERO_CHANNEL_ID
    });

    const response = await axios.post(
      "https://backend.payhero.co.ke/api/v2/payments",
      {
        amount: PAYMENT_AMOUNT_KES,
        phone_number: phone,
        channel_id: process.env.PAYHERO_CHANNEL_ID,
        provider: "m-pesa",
        external_reference: user._id.toString(),
        callback_url: process.env.PAYHERO_CALLBACK_URL
      },
      {
        headers: {
          Authorization: `Basic ${process.env.PAYHERO_BASIC_AUTH}`,
          "Content-Type": "application/json"
        },
        timeout: 15000
      }
    );

    console.log("✅ PAYHERO RESPONSE:", response.data);

    return res.json({
      message: "STK prompt sent successfully"
    });
  } catch (err) {
    console.error("❌ STK PUSH FAILED — RAW ERROR");

    console.error(
      JSON.stringify(
        {
          message: err.message,
          status: err.response?.status,
          data: err.response?.data
        },
        null,
        2
      )
    );

    return res.status(500).json({
      message: "Payment gateway error. Please try again."
    });
  }
};

// ===================================
// PAYHERO CALLBACK
// ===================================
exports.payheroCallback = async (req, res) => {
  try {
    const payload = req.body;

    if (!payload || payload.status !== "success") {
      return res.json({ received: true });
    }

    const userId = payload.external_reference;
    const user = await User.findById(userId);
    if (!user) return res.json({ received: true });

    if (user.verifiedUntil && user.verifiedUntil > new Date()) {
      return res.json({ received: true });
    }

    user.connects += CONNECTS_GRANTED;
    user.verifiedUntil = new Date(
      Date.now() + VERIFICATION_DAYS * 24 * 60 * 60 * 1000
    );

    await user.save();

    console.log("✅ USER VERIFIED VIA PAYMENT:", user.email);

    return res.json({ received: true });
  } catch (err) {
    console.error("❌ PAYHERO CALLBACK ERROR:", err);
    return res.json({ received: true });
  }
};
