const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  password: { type: String, required: true, minlength: 6 },

  // Verification fields
  verified: { type: Boolean, default: false }, // email verification
  verificationCode: String,
  verificationCodeExpire: Date,
  resetCode: String,
  resetCodeExpire: Date,

  // Job application / manual verification fields
  connects: { type: Number, default: 3 },            // Free users can apply 3 times
  isManuallyVerified: { type: Boolean, default: false }, // Admin verifies users for unlimited applications
  applications: [{ type: mongoose.Schema.Types.ObjectId, ref: "Job" }], // Track applied jobs
});

// Hash password before save
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("User", userSchema);
