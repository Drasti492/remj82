require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { PORT, MONGO_URI, CLIENT_URL } = require("./config");

const app = express();

// ===== Middleware =====
app.use(express.json());

// ✅ CORS configuration — allow both local + live frontend
const allowedOrigins = [
  CLIENT_URL, // from your .env (Render)
  "https://remfr.vercel.app",
  "http://localhost:5173", // for Vite local dev
  "http://127.0.0.1:5500" // VSCode Live Server
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("❌ CORS blocked origin:", origin);
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
    const port = PORT || 4000;
    app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
  })
  .catch((err) => console.error("❌ MongoDB error:", err));

// Export for serverless
module.exports = app;
