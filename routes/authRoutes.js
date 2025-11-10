const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/auth"); // Add middleware

// Auth routes
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.post("/verify-code", authController.verifyCode);
router.get("/user", authMiddleware, authController.getUser); // New endpoint

const jwt = require("jsonwebtoken");

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Invalid credentials." });

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials." });

        // Generate token with 7 days expiration
        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "7d" } // token valid 7 days
        );

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                isManuallyVerified: user.isManuallyVerified,
                connects: user.connects
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error." });
    }
};


module.exports = router;