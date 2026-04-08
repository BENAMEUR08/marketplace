const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  name: String,
  price: Number,
  code: {
    type: String,
    unique: true
  },
  trader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Trader"
  }
},{ timestamps: true });
ProductSchema.index({ trader: 1 });
module.exports = mongoose.model("Product", ProductSchema);