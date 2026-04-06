// models/Operation.js
const mongoose = require("mongoose");

const operationSchema = new mongoose.Schema({
  name: String, // اسم العملية
  startDate: Date, // تاريخ بداية الاقتطاع
  endDate: Date,   // تاريخ نهاية الاقتطاع
  monthsCount: Number, // عدد الأشهر

  taxPercent: {
    type: Number,
    required: true,
    default: 0
  },

  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Operation", operationSchema);