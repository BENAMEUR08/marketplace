const express = require("express");
const router = express.Router();
const Trader = require("../models/Trader");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Operation = require("../models/Operation");
const ExcelJS = require("exceljs");
/* الصفحة الرئيسية */
router.get("/", async (req, res) => {
    const traders = await Trader.find();
    const products = await Product.find().populate("trader");
    
    const activeOperation = await Operation.findOne({ isActive: true }); // العملية النشطة
    
    res.render("dashboard", {
      traders,
      products,
      activeOperation,  // تمرير المتغير للـ EJS
      taxPercent: activeOperation ? activeOperation.taxPercent : 0,
      toast: req.query.toast || null
    });
  });
/* إضافة تاجر */
router.post("/trader/add", async (req, res) => {
    const { name, phone, email, field } = req.body;
    try {
        const traderExists = await Trader.findOne({ $or: [{ email }, { phone }] });
        if (traderExists) return res.redirect("/?toast=exists");

        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const lastTrader = await Trader.findOne().sort({ createdAt: -1 });
        let prefix = "A";
        if (lastTrader && lastTrader.prefix) {
            const lastIndex = letters.indexOf(lastTrader.prefix);
            prefix = letters[lastIndex + 1] || "T" + Date.now();
        }

        await Trader.create({ name, phone, email, field, prefix });
        res.redirect("/");
    } catch (err) {
        console.error(err);
        res.redirect("/?toast=error");
    }
});

/* حذف تاجر */
router.post("/trader/delete/:id", async (req, res) => {
    const mongoose = require("mongoose");
    const traderId = req.params.id;
  
    // ✅ تحقق من صحة الـ ObjectId
    if (!mongoose.Types.ObjectId.isValid(traderId)) {
      return res.redirect("/?toast=invalid_id");
    }
  
    const session = await mongoose.startSession();
    session.startTransaction();
  
    try {
      // 1️⃣ جلب المنتجات الخاصة بالتاجر
      const products = await Product.find({ trader: traderId }, null, { session });
      const productIds = products.map(p => p._id);
  
      // 2️⃣ التحقق إذا هناك طلبات مرتبطة بأي منتج
      const orderExists = await Order.findOne(
        { "products.product": { $in: productIds } },
        null,
        { session }
      );
      if (orderExists) {
        await session.abortTransaction();
        session.endSession();
        return res.redirect("/?toast=has_sales");
      }
  
      // 3️⃣ حذف المنتجات
      await Product.deleteMany({ trader: traderId }, { session });
  
      // 4️⃣ حذف التاجر
      await Trader.findByIdAndDelete(traderId, { session });
  
      // 5️⃣ تثبيت التغييرات
      await session.commitTransaction();
      session.endSession();
  
      res.redirect("/?toast=deleted");
  
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error(err);
      res.redirect("/?toast=error");
    }
  });

/* تعديل تاجر */
router.post("/trader/update/:id", async (req, res) => {
    await Trader.findByIdAndUpdate(req.params.id, req.body);
    res.redirect("/");
});

/* صفحة سلع التاجر */
router.get("/trader/:id/products", async (req, res) => {
    const trader = await Trader.findById(req.params.id);
    const products = await Product.find({ trader: req.params.id });
    res.render("traderProducts", { trader, products });
});

module.exports = router;