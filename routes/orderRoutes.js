const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Operation = require("../models/Operation");
const Product = require("../models/Product");
const ExcelJS = require("exceljs");
const { isAuth } = require("../middlewares/auth");

/* إضافة طلب */
router.post("/order/add",isAuth, async (req, res) => {
    try {
        const activeOperation = await Operation.findOne({ isActive: true });

        if (!activeOperation) {
            return res.redirect("/?toast=no_operation");
        }

        const {
            firstName,
            lastName,
            firstNameFr,
            lastNameFr,
            job,
            birthDate,
            workPlace,
            postalAccount,
            cleCcp,
            phone,
            membershipCard,
            products,
            salary,
            totalWithTax
        } = req.body;

        // ✅ تحقق من الحقول
        const isEmpty = (val) => !val || val.trim() === "";
        if (
           isEmpty(firstName) ||
           isEmpty(lastName) ||
           isEmpty(job) ||
           isEmpty(workPlace) ||
           isEmpty(postalAccount) ||
           isEmpty(phone) ||
           isEmpty(membershipCard)
           ) {
              return res.redirect("/?toast=missing_fields");
         }
        const salaryValue = parseFloat(salary);

        if (!/^[0-9]{1,20}$/.test(postalAccount)) {
            return res.redirect("/?toast=invalid_ccp");
        }

        if (isNaN(salaryValue) || salaryValue <= 0) {
             return res.redirect("/?toast=invalid_salary");
        }
        // ✅ تحقق من الهاتف
        if (!/^(05|06|07)[0-9]{8}$/.test(phone)) {
            return res.redirect("/?toast=invalid_phone");
        }

        // ✅ منع تكرار الطلب (بطاقة أو هاتف)
        const existingOrder = await Order.findOne({
            operation: activeOperation._id,
            $or: [
                { membershipCard: membershipCard },
                { phone: phone }
            ]
        });

        if (existingOrder) {
            return res.redirect("/?toast=already_ordered");
        }

        // ✅ تحقق من وجود منتجات
        if (!products || (Array.isArray(products) && products.length === 0)) {
            return res.redirect("/?toast=no_products");
        }

        let selectedProducts = [];
        let totalCalculated = 0;

        const productList = Array.isArray(products) ? products : [products];

        // 🔥 النسبة من العملية (المصدر الوحيد)
        const taxPercent = activeOperation.taxPercent || 0;

        const productsFromDB = await Product.find({ _id: { $in: productList } });

        for (let product of productsFromDB) {
            const id = product._id.toString();
            const qty = parseInt(req.body["qty_" + id]);
        
            if (!qty || qty <= 0 || qty > 1000) {
                return res.redirect("/?toast=invalid_qty");
            }
        
            const price = product.price;
            const priceWithTax = +(price * (1 + taxPercent / 100)).toFixed(2);
        
            totalCalculated += priceWithTax * qty;
        
            selectedProducts.push({
                product: id,
                quantity: qty,
                price,
                priceWithTax
            });
        }
        // ✅ حساب الحد الأقصى (30% من الراتب)
        const maxAllowed = salaryValue * 0.3;

        if (totalCalculated > maxAllowed) {
            return res.redirect(`/?toast=salary_limit&max=${maxAllowed.toFixed(2)}`);
        }
        // ✅ حماية من التلاعب (front-end)
        const totalFromClient = parseFloat(totalWithTax) || 0;

        if (Math.abs(totalCalculated - totalFromClient) > 1) {
            return res.redirect("/?toast=total_mismatch");
        }

        // ✅ إنشاء الطلب
        await Order.create({
            firstName,
            lastName,
            firstNameFr,
            lastNameFr,
            job,
            birthDate,
            workPlace,
            postalAccount,
            cleCcp,
            phone,
            membershipCard,
            products: selectedProducts,
            total: totalCalculated,
            taxPercent: taxPercent, // 🔥 مهم جدا
            operation: activeOperation._id
        });

        res.redirect("/?toast=order_created");

    } catch (err) {
        console.error(err);
        res.redirect("/?toast=error");
    }
});
/* حذف طلب */
router.delete("/order/delete/:id",isAuth, async (req, res) => {
    try { await Order.findByIdAndDelete(req.params.id); res.json({ success: true }); }
    catch { res.json({ success: false }); }
});

/* عرض الطلبات */
router.get("/orders",isAuth, async (req, res) => {
    const orders = await Order.find()
        .populate({
            path: "products.product",
            populate: { path: "trader" }
        })
        .populate("operation");

    const operation = orders.length ? orders[0].operation : null;

    res.render("orders", { orders, operation });
});



module.exports = router;