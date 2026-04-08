const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({

  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  firstNameFr: { type: String, required: true },
  lastNameFr: { type: String, required: true },
  job: { type: String, required: true },
  birthDate: { type: Date, required: true },
  workPlace: { type: String, required: true },
  postalAccount: { type: Number, required: true },
  
  cleCcp: {
    type: Number
  },

  phone: { 
    type: String, 
    required: true,
    match: /^[0-9]{8,15}$/ // ✅ تحقق من رقم الهاتف
  },

  membershipCard: { 
    type: String, 
    required: true 
  },

  // ✅ المنتجات مع السعر المخزن
  products: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },

      quantity: { 
        type: Number, 
        required: true,
        min: 1 
      },

      price: { 
        type: Number, 
        required: true,
        min: 0 
      },

      priceWithTax: { 
        type: Number, 
        required: true,
        min: 0 
      }
    }
  ],

  // ✅ المجموع النهائي
  total: { 
    type: Number, 
    required: true,
    min: 0 
  },

  // ✅ تخزين النسبة المستعملة
  taxPercent: { 
    type: Number, 
    required: true,
    min: 0 
  },

  // ✅ ربط العملية
  operation: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Operation",
    required: true
  },

  createdAt: { type: Date, default: Date.now }

});
orderSchema.index({ operation: 1 });
orderSchema.index({ "products.product": 1 });
module.exports = mongoose.model("Order", orderSchema);