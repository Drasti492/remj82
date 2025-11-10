const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  verified: { type: Boolean, default: false },
  verificationCode: String,
  verificationCodeExpire: Date,
  resetCode: String,
  resetCodeExpire: Date,
  connects: { type: Number, default: 3 },
  isManuallyVerified: { type: Boolean, default: false },
  applications: [{ type: Object }] // Store jobId, title, company, description
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("User", userSchema);
