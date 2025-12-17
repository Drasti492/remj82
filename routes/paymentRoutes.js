const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const authMiddleware = require("../middleware/auth");

router.get("/test-payhero", async (req, res) => {
  try {
    const axios = require("axios");

    const r = await axios.get("https://backend.payhero.co.ke", {
      timeout: 10000
    });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// STK Push
router.post("/stk-push", authMiddleware, paymentController.stkPush);

// PayHero Callback
router.post("/payhero-callback", paymentController.payheroCallback);

module.exports = router;
