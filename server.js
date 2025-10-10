require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { PORT, MONGO_URI } = require("./config");

const app = express();

// ===== Middleware =====
app.use(express.json());

// CORS configuration for local and Vercel deployment
const allowedOrigins = [
  "http://127.0.0.1:5500", // Local development (VS Code Live Server)
  "https://gloweycosmetics.vercel.app/", // Replace with your actual Vercel URL
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// ===== Routes =====
app.use("/api/auth", require("./routes/authRoutes"));

// ===== MongoDB Connection =====
mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ MongoDB Atlas connected!");
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);

  })
  .catch((err) => console.error("❌ MongoDB error:", err));

// Export app for Vercel
module.exports = app;