// routes/authRoutes.js — FINAL & WORKING (NO MORE ERROR)
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { protect } = require("../middleware/auth"); // ← THIS IS CORRECT

// Public routes
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.post("/verify-code", authController.verifyCode);

// Protected route — get current user
router.get("/user", protect, authController.getUser); // ← FIXED: use "protect" not "authMiddleware"

module.exports = router;