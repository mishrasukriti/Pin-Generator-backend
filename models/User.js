const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  fname: {
    type: String,
    required: true,
    min: 6,
    max: 255,
  },
  lname: {
    type: String,
    required: true,
    min: 6,
    max: 255,
  },
  email: {
    type: String,
    required: true,
    max: 255,
    min: 6,
  },
  password: {
    type: String,
    required: true,
    max: 1024,
    min: 6,
  },
  
  randomString: {
    type: String
  },
  isActivated: {
    type: String
  },
  activateString: {
    type: String,
    required: true,
    max: 10,
    min: 2,
  },
  resendOTPLimit: {
    type: Number,
    default: 3,
  },
});

module.exports = mongoose.model("User", userSchema);
