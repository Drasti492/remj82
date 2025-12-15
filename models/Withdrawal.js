const mongoose = require("mongoose");

const withdrawalSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  amount: Number,
  method: String,
  address: String,
  status: { type: String, default: "pending" }, // pending | approved | rejected
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Withdrawal", withdrawalSchema);
