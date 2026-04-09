const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const Order = require("../models/Order");
const Operation = require("../models/Operation");
const multer = require("multer");
const XLSX = require("xlsx");
const fs = require("fs");
const { isAuth } = require("../middlewares/auth");
const upload = multer({ dest: "uploads/" });

/* إضافة سلعة */
router.post("/product/add/:traderId",isAuth, async (req, res) => {
    const { name, price } = req.body;
    const traderId = req.params.traderId;
    const trader = await require("../models/Trader").findById(traderId);
    if (!trader) return res.status(404).send("التاجر غير موجود");

    const lastProduct = await Product.findOne({ trader: traderId }).sort({ code: -1 });
    let nextNumber = 1;
    if (lastProduct && lastProduct.code) {
        const num = parseInt(lastProduct.code.substring(trader.prefix.length));
        nextNumber = num + 1;
    }

    const code = trader.prefix + String(nextNumber).padStart(2, "0");
    if (await Product.findOne({ code })) return res.status(400).send("الكود مكرر");

    await Product.create({ name, price, code, trader: traderId });
    res.redirect("/trader/" + traderId + "/products");
});

/* رفع ملف Excel */
router.post("/product/upload/:traderId",isAuth, upload.single("excelFile"), async (req, res) => {
    try {
        const traderId = req.params.traderId;
        const trader = await require("../models/Trader").findById(traderId);
        if (!trader) return res.status(404).send("التاجر غير موجود");

        const lastProduct = await Product.findOne({ trader: traderId }).sort({ code: -1 });
        let nextNumber = lastProduct ? parseInt(lastProduct.code.substring(trader.prefix.length)) + 1 : 1;

        const workbook = XLSX.readFile(req.file.path);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);

        for (let item of data) {
            const name = item.name?.toString().trim();
            const price = parseFloat(item.price);
            if (!name || !price) continue;
            if (await Product.findOne({ name, trader: traderId })) continue;

            const code = trader.prefix + String(nextNumber).padStart(2, "0");
            await Product.create({ name, price, code, trader: traderId });
            nextNumber++;
        }

        fs.unlinkSync(req.file.path);
        res.redirect("/trader/" + traderId + "/products?toast=excel_success");
    } catch (err) {
        console.error(err);
        res.status(500).send("خطأ أثناء رفع الملف");
    }
});

/* حذف سلعة */
router.get("/product/delete/:id/:traderId",isAuth, async (req, res) => {
    const productId = req.params.id;
    const traderId = req.params.traderId;

    const existsInOrders = await Order.findOne({ "products.product": productId });
    if (existsInOrders) return res.redirect("/trader/" + traderId + "/products?toast=product_has_orders");

    await Product.findByIdAndDelete(productId);
    res.redirect("/trader/" + traderId + "/products?toast=product_deleted");
});

/* تعديل سلعة */
router.post("/product/update/:id/:traderId",isAuth, async (req, res) => {
    try {
        // 🔍 تحقق من وجود عملية نشطة
        const activeOperation = await Operation.findOne({ isActive: true });

        if (activeOperation) {
            return res.redirect("/trader/" + req.params.traderId + "/products?toast=operation_active");
        }

        // ✏️ التعديل عادي إذا لا توجد عملية
        await Product.findByIdAndUpdate(req.params.id, {
            name: req.body.name,
            price: req.body.price
        });

        res.redirect("/trader/" + req.params.traderId + "/products?toast=product_updated");

    } catch (err) {
        console.error(err);
        res.redirect("/trader/" + req.params.traderId + "/products?toast=error");
    }
});

module.exports = router;