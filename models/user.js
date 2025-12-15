const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    // ===============================
    // BASIC INFO
    // ===============================
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    phone: {
      type: String,
      required: true,
      trim: true
    },

    password: {
      type: String,
      required: true,
      minlength: 8
    },

    // ===============================
    // VERIFICATION & ACCESS
    // ===============================
    verified: {
      type: Boolean,
      default: false
    },

    verifiedUntil: {
      type: Date,
      default: null
    },

    isManuallyVerified: {
      type: Boolean,
      default: false
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    },

    // ===============================
    // CODES
    // ===============================
    verificationCode: String,
    verificationCodeExpire: Date,

    resetCode: String,
    resetCodeExpire: Date,

    // ===============================
    // PLATFORM DATA
    // ===============================
    connects: {
      type: Number,
      default: 0
    },

    applications: [
      {
        jobId: { type: String, required: true },
        title: String,
        company: String,
        description: String,
        appliedAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

// ===============================
// HASH PASSWORD
// ===============================
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// ===============================
// COMPARE PASSWORD
// ===============================
userSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

// ===============================
// CHECK IF VERIFIED (PAYMENT-BASED)
// ===============================
userSchema.methods.isVerifiedNow = function () {
  if (this.verifiedUntil && this.verifiedUntil > Date.now()) return true;
  return this.verified === true || this.isManuallyVerified === true;
};

module.exports = mongoose.model("User", userSchema);
