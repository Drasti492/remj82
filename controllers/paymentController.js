const axios = require("axios");
const User = require("../models/user");

const PAYMENT_AMOUNT_KES = 1340;
const CONNECTS_GRANTED = 8;
const VERIFICATION_DAYS = 30;

// ===================================
// INITIATE STK PUSH (PAYHERO)
// ===================================
exports.stkPush = async (req, res) => {
  try {
    let { phone } = req.body;

    console.log("➡️ STK PUSH REQUEST:", phone, req.user?._id);

    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    // Normalize phone number
    phone = phone.replace(/\s+/g, "");
    if (phone.startsWith("0")) phone = "254" + phone.slice(1);

    if (!/^2547\d{8}$/.test(phone)) {
      return res.status(400).json({ message: "Invalid phone number format" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent paying twice if still active
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
      message: "STK prompt sent successfully",
      reference: response.data?.reference || null
    });

  } catch (err) {
    console.error("❌ STK PUSH FAILED");

    console.error("MESSAGE:", err.message);

    if (err.code === "ECONNABORTED") {
      console.error("⏱️ PayHero request timed out");
    }

    if (err.response) {
      console.error("PAYHERO STATUS:", err.response.status);
      console.error(
        "PAYHERO DATA:",
        JSON.stringify(err.response.data, null, 2)
      );
    }

    console.error("ENV CHECK:", {
      PAYHERO_BASIC_AUTH: !!process.env.PAYHERO_BASIC_AUTH,
      PAYHERO_CHANNEL_ID: !!process.env.PAYHERO_CHANNEL_ID,
      PAYHERO_CALLBACK_URL: !!process.env.PAYHERO_CALLBACK_URL
    });

    return res.status(500).json({
      message:
        err.response?.data?.message ||
        "Payment initiation failed. Please try again."
    });
  }
};

// ===================================
// PAYHERO CALLBACK
// ===================================
exports.payheroCallback = async (req, res) => {
  try {
    const payload = req.body;

    console.log("🔔 PAYHERO CALLBACK:", payload);

    // Always acknowledge PayHero
    if (!payload || payload.status !== "success") {
      return res.json({ received: true });
    }

    const userId = payload.external_reference;
    const user = await User.findById(userId);
    if (!user) return res.json({ received: true });

    // Prevent double credit
    if (user.verifiedUntil && user.verifiedUntil > new Date()) {
      return res.json({ received: true });
    }

    user.connects += CONNECTS_GRANTED;
    user.verifiedUntil = new Date(
      Date.now() + VERIFICATION_DAYS * 24 * 60 * 60 * 1000
    );

    await user.save();

    console.log("✅ USER VERIFIED & CONNECTS ADDED:", user.email);

    return res.json({ received: true });

  } catch (err) {
    console.error("❌ PAYHERO CALLBACK ERROR:", err.message);
    return res.json({ received: true });
  }
};
