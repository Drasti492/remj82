const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    phone: {
      type: String,
      required: true
    },

    amount: {
      type: Number,
      required: true
    },

    currency: {
      type: String,
      default: "KES"
    },

    method: {
      type: String,
      default: "PayHero STK Push"
    },

    reference: {
      type: String,
      required: true,
      unique: true
    },

    connects: {
      type: Number,
      default: 8
    },

    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
