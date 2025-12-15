const axios = require("axios");
const Payment = require("../models/Payment");
const User = require("../models/user");

// ===============================
// INITIATE STK PUSH
// ===============================
exports.stkPush = async (req, res) => {
  try {
    const user = req.user;
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone number required" });
    }

    const cleanPhone = phone.replace(/^0/, "254");
    const amount = 100; // Example price
    const connects = 8;

    const payment = await Payment.create({
      user: user._id,
      phone: cleanPhone,
      amount,
      connects
    });

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
      message: "Payment prompt sent to your phone"
    });

  } catch (err) {
    console.error("STK error:", err.message);
    res.status(500).json({ message: "Payment initiation failed" });
  }
};

// ===============================
// PAYHERO CALLBACK (CRITICAL)
// ===============================
exports.payheroCallback = async (req, res) => {
  try {
    const { external_reference, status } = req.body;

    const payment = await Payment.findById(external_reference);
    if (!payment || payment.status === "success") {
      return res.status(200).end();
    }

    if (status !== "success") {
      payment.status = "failed";
      await payment.save();
      return res.status(200).end();
    }

    payment.status = "success";
    await payment.save();

    const user = await User.findById(payment.user);
    if (user) {
      user.connects += payment.connects;
      user.verifiedUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await user.save();
    }

    res.status(200).end();

  } catch (err) {
    console.error("Callback error:", err.message);
    res.status(500).end();
  }
};
