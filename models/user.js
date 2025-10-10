const mongoose = require("mongoose");
const bcrypt = require("bcryptjs"); // ✅ import bcrypt

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  resetToken: String,
  resetTokenExpire: Date,
  verified: { type: Boolean, default: false }, // Added for email verification
  verificationCode: String,
  verificationCodeExpire: Date,

});

// Hash password before save
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Method to compare passwords
userSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};


module.exports = mongoose.model("User", userSchema);