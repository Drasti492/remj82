const express = require("express");
const router = express.Router();
const authCtrl = require("../controllers/authController");

// Routes
router.post("/send-verification", authCtrl.sendVerificationEmail);
router.post("/verify-code", authCtrl.verifyCode);
router.post("/register", authCtrl.register);
router.post("/login", authCtrl.login);
router.post("/logout", authCtrl.logout);
router.post("/forgot-password", authCtrl.forgotPassword);
router.post("/reset-password", authCtrl.resetPassword);

module.exports = router;