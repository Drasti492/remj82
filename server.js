require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Brevo = require("@getbrevo/brevo");
const { PORT, MONGO_URI } = require("./config");

const app = express();

// Middleware
app.use(express.json());

// ✅ CORS setup
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5500",
  "https://remote-pro-jobs.vercel.app",
   "https://remoteprojobs.site" 
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) callback(null, true);
      else callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);

// ✅ MongoDB strict mode
mongoose.set("strict", true);

// ✅ Import routes
const authRoutes = require("./routes/authRoutes");
const orderRoutes = require("./routes/orderRoutes");
const applicationsRoutes = require("./routes/applicationsRoutes");
const notificationsRoutes = require("./routes/notificationsRoutes");
const verifyRoutes = require("./routes/verifyRoutes");

// ✅ Use routes
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/applications", applicationsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/verify", verifyRoutes);

// ✅ Email order notification route (Brevo)
const brevo = new Brevo.TransactionalEmailsApi();
brevo.authentications["apiKey"].apiKey = process.env.BREVO_API_KEY;

app.post("/api/order", async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, cart, total } = req.body;

    if (!cart || cart.length === 0)
      return res.status(400).json({ message: "Cart is empty." });

    const orderItemsHtml = cart
      .map(
        (item) => `
        <li>
          <strong>${item.name}</strong> - Ksh ${item.price} × ${item.quantity}<br>
          <small>${item.description || ""}</small>
        </li>`
      )
      .join("");

    // Send to Admin
    const adminEmail = new Brevo.SendSmtpEmail();
    adminEmail.sender = { email: "no-reply@yourdomain.com", name: "Your Shop" };
    adminEmail.to = [{ email: "youremail@example.com", name: "Store Admin" }];
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

    // Send to Customer
    const clientEmail = new Brevo.SendSmtpEmail();
    clientEmail.sender = { email: "no-reply@yourdomain.com", name: "Your Shop" };
    clientEmail.to = [{ email: customerEmail, name: customerName }];
    clientEmail.subject = "✅ Order Confirmation - Your Purchase Summary";
    clientEmail.htmlContent = `
      <h2>Hi ${customerName},</h2>
      <p>Thank you for shopping with us! Here is your order summary:</p>
      <ul>${orderItemsHtml}</ul>
      <p><strong>Total:</strong> Ksh ${total.toFixed(2)}</p>
      <p>Our team will contact you soon for delivery.</p>
      <p>— The Your Shop Team</p>
    `;

    await brevo.sendTransacEmail(clientEmail);

    const whatsappUrl = `https://wa.me/254796485518?text=Hi%20${encodeURIComponent(
      customerName
    )},%20thank%20you%20for%20your%20order%20of%20Ksh%20${total.toFixed(
      2
    )}%20from%20Your%20Shop.%20We%20will%20contact%20you%20soon.`;

    res.status(200).json({
      message: "Order notification sent successfully.",
      whatsappRedirect: whatsappUrl
    });
  } catch (error) {
    console.error("Error sending order email:", error.message);
    res.status(500).json({ message: "Failed to send order email." });
  }
});

// ✅ Connect MongoDB & start server
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("✅ MongoDB Atlas connected!");
    app.listen(PORT || 4000, () =>
      console.log(`🚀 Server running on port ${PORT || 4000}`)
    );
  })
  .catch((err) => {
    console.error("❌ MongoDB error:", err.message);
    process.exit(1);
  });

module.exports = app;
