const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const paymentController = require("../controllers/paymentController");

// STK PUSH
router.post("/stk-push", auth, paymentController.stkPush);

// PAYHERO CALLBACK (NO AUTH)
router.post("/payhero-callback", paymentController.payheroCallback);

module.exports = router;
