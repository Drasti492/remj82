const axios = require("axios");
const Payment = require("../models/Payment");
const User = require("../models/user");

// ===============================
// INITIATE STK PUSH
// ===============================
exports.stkPush = async (req, res) => {
  try {
    const { phone } = req.body;
    const user = req.user;

    if (!phone) {
      return res.status(400).json({ message: "Phone number required" });
    }

    const cleanPhone = phone.replace(/^0/, "254");
    const amount = 100; // KES
    const connects = 8;

    // Create payment record FIRST
    const payment = await Payment.create({
      user: user._id,
      phone: cleanPhone,
      amount,
      connects,
      reference: `PH_${Date.now()}`
    });

    // 🔐 PAYHERO API CALL (REAL)
    await axios.post(
      "https://backend.payhero.co.ke/api/v2/payments",
      {
        amount,
        phone_number: cleanPhone,
        channel_id: process.env.PAYHERO_CHANNEL_ID,
        provider: "m-pesa",
        external_reference: payment._id.toString(),
        callback_url: process.env.PAYHERO_CALLBACK_URL
      },
      {
        headers: {
          Authorization: process.env.PAYHERO_BASIC_AUTH,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({
      success: true,
      message: "STK prompt sent to your phone"
    });

  } catch (err) {
    console.error("STK Push error:", err.response?.data || err.message);
    res.status(500).json({ message: "Failed to initiate payment" });
  }
};

// ===============================
// PAYHERO CALLBACK
// ===============================
exports.payheroCallback = async (req, res) => {
  try {
    const { external_reference, status } = req.body;

    const payment = await Payment.findById(external_reference);
    if (!payment || payment.status === "success") {
      return res.sendStatus(200);
    }

    if (status !== "success") {
      payment.status = "failed";
      await payment.save();
      return res.sendStatus(200);
    }

    // Mark payment success
    payment.status = "success";
    await payment.save();

    // 🔥 AUTO VERIFY USER
    const user = await User.findById(payment.user);
    if (user) {
      user.connects += payment.connects;
      user.isManuallyVerified = true;
      user.verifiedUntil = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      );
      await user.save();
    }

    res.sendStatus(200);

  } catch (err) {
    console.error("PayHero callback error:", err.message);
    res.sendStatus(500);
  }
};
