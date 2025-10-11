require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Brevo = require("@getbrevo/brevo"); // ✅ use require, not import
const { PORT, MONGO_URI, CLIENT_URL } = require("./config");

// ✅ Initialize Express first
const app = express();

// ✅ Import routes AFTER app is created
const orderRoutes = require("./routes/orderRoutes");
const authRoutes = require("./routes/authRoutes");

// ===== Middleware =====
app.use(express.json());

// ✅ CORS configuration — allow both local + live frontend
const allowedOrigins = [
  CLIENT_URL,
  "https://remfr.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5500"
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

// ===== Use routes =====
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);

// ==============================
// 🛒 ORDER NOTIFICATION ROUTE
// ==============================
const brevo = new Brevo.TransactionalEmailsApi();
brevo.authentications["apiKey"].apiKey = process.env.BREVO_API_KEY;

app.post("/api/order", async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, cart, total } = req.body;

    if (!cart || cart.length === 0) {
      return res.status(400).json({ message: "Cart is empty." });
    }

    // Format order details
    const orderItemsHtml = cart
      .map(
        (item) => `
          <li>
            <strong>${item.name}</strong> - Ksh ${item.price} × ${item.quantity}<br>
            <small>${item.description || ""}</small>
          </li>`
      )
      .join("");

    // ==========================
    // Email to Admin
    // ==========================
    const adminEmail = new Brevo.SendSmtpEmail();
    adminEmail.sender = { email: "no-reply@yourdomain.com", name: "Your Shop" };
    adminEmail.to = [{ email: "youremail@example.com", name: "Store Admin" }]; // ✅ put your real admin email
    adminEmail.subject = `🛒 New Order from ${customerName}`;
    adminEmail.htmlContent = `
      <h2>New Order Received</h2>
      <p><strong>Name:</strong> ${customerName}</p>
      <p><strong>Email:</strong> ${customerEmail}</p>
      <p><strong>Phone:</strong> ${customerPhone}</p>
      <h3>Order Details:</h3>
      <ul>${orderItemsHtml}</ul>
      <h3>Total: Ksh ${total.toFixed(2)}</h3>
    `;

    await brevo.sendTransacEmail(adminEmail);

    // ==========================
    // Email to Customer
    // ==========================
    const clientEmail = new Brevo.SendSmtpEmail();
    clientEmail.sender = { email: "no-reply@yourdomain.com", name: "Your Shop" };
    clientEmail.to = [{ email: customerEmail, name: customerName }];
    clientEmail.subject = "✅ Order Confirmation - Your Purchase Summary";
    clientEmail.htmlContent = `
      <h2>Hi ${customerName},</h2>
      <p>Thank you for shopping with us! Here is your order summary:</p>
      <ul>${orderItemsHtml}</ul>
      <p><strong>Total:</strong> Ksh ${total.toFixed(2)}</p>
      <p>Our team will contact you soon for delivery and clearance.</p>
      <br>
      <p>For any inquiries, reach us at <a href="mailto:support@yourdomain.com">support@yourdomain.com</a></p>
      <p>— The Your Shop Team</p>
    `;

    await brevo.sendTransacEmail(clientEmail);

    // ✅ Optional: WhatsApp redirect
    const whatsappUrl = `https://wa.me/254796485518?text=Hi%20${customerName},%20thank%20you%20for%20your%20order%20of%20Ksh%20${total.toFixed(
      2
    )}%20from%20Your%20Shop.%20Our%20team%20will%20contact%20you%20soon.`;

    res.status(200).json({
      message: "Order notification sent successfully.",
      whatsappRedirect: whatsappUrl,
    });
  } catch (error) {
    console.error("Error sending order email:", error);
    res.status(500).json({ message: "Failed to send order email." });
  }
});

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

module.exports = app;
