const mongoose = require('mongoose');

const traderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  field: { type: String, required: true },
  prefix: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true 
  }

}, { timestamps: true });

module.exports = mongoose.model('Trader', traderSchema);