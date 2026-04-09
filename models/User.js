const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true
  },

  password: { 
    type: String, 
    required: true 
  },

  role: { 
    type: String, 
    enum: ["admin", "manager"], 
    default: "manager"
  }

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);