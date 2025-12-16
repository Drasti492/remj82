const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const authMiddleware = require("../middleware/auth");

// STK Push
router.post("/stk-push", authMiddleware, paymentController.stkPush);

// PayHero Callback
router.post("/payhero-callback", paymentController.payheroCallback);

module.exports = router;
