const express = require("express");
const router = express.Router();
const paymentsController = require("../controllers/paymentsController");
const authMiddleware = require("../middleware/auth");

// STK Push
router.post("/stk-push", authMiddleware, paymentsController.stkPush);

// PayHero Callback
router.post("/payhero-callback", paymentsController.payheroCallback);

module.exports = router;
