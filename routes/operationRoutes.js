// routes/operationRoutes.js
const express = require("express");
const router = express.Router();
const Operation = require("../models/Operation");
const ExcelJS = require("exceljs");
const Order = require("../models/Order");

// إنشاء عملية جديدة
router.post("/operation/add", async (req, res) => {
  try {
    let { name, startDate, endDate, taxPercent } = req.body;

    // تحويل القيم
    const start = new Date(startDate);
    const end = new Date(endDate);
    taxPercent = parseFloat(taxPercent);

    // ✅ التحقق من التواريخ
    if (!startDate || !endDate || isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.redirect("/?toast=invalid_date");
    }

    if (start >= end) {
      return res.redirect("/?toast=date_error"); // البداية يجب أن تكون قبل النهاية
    }

    // ✅ التحقق من النسبة
    if (isNaN(taxPercent)) taxPercent = 0;

    if (taxPercent < 0) {
      return res.redirect("/?toast=negative_tax");
    }

    if (taxPercent > 100) {
      return res.redirect("/?toast=high_tax");
    }

    // ✅ حساب عدد الأشهر
    const monthsCount =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth());

    if (monthsCount <= 0) {
      return res.redirect("/?toast=invalid_months");
    }

    // ✅ منع وجود عملية نشطة
    const exists = await Operation.findOne({ isActive: true });
    if (exists) return res.redirect("/?toast=operation_exists");

    // ✅ إنشاء العملية
    await Operation.create({
      name,
      startDate: start,
      endDate: end,
      monthsCount,
      taxPercent
    });

    res.redirect("/?toast=operation_created");

  } catch (err) {
    console.error(err);
    res.redirect("/?toast=error");
  }
});

// إنهاء العملية الحالية

// إنهاء العملية وحذف جميع الطلبات نهائياً
router.post("/operation/end/:id", async (req, res) => {
  const mongoose = require("mongoose");
  const operationId = req.params.id;

  // ✅ تحقق من صحة الـ ObjectId
  if (!mongoose.Types.ObjectId.isValid(operationId)) {
    return res.redirect("/?toast=invalid_id");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1️⃣ إيقاف العملية
    const operation = await Operation.findByIdAndUpdate(
      operationId,
      { isActive: false },
      { session, new: true }
    );

    if (!operation) {
      await session.abortTransaction();
      session.endSession();
      return res.redirect("/?toast=operation_not_found");
    }

    // 2️⃣ حذف نهائي لكل الطلبات المرتبطة
    await Order.deleteMany({ operation: operationId }, { session });

    // 3️⃣ Commit Transaction
    await session.commitTransaction();
    session.endSession();

    res.redirect("/?toast=operation_ended");

  } catch (err) {
    // ❌ Rollback إذا صار خطأ
    await session.abortTransaction();
    session.endSession();
    console.error(err);
    res.redirect("/?toast=error");
  }
});

// تحميل كل الطلبات لعملية معينة
router.get("/operation/download/:id", async (req, res) => {
  try {
    const operationId = req.params.id;

    const mongoose = require("mongoose");
    if (!mongoose.Types.ObjectId.isValid(operationId)) {
      return res.redirect("/?toast=invalid_id");
    }

    // جلب العملية
    const operation = await Operation.findById(operationId);
    if (!operation) {
      return res.redirect("/?toast=error");
    }

    // إنشاء workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Orders");

    // الأعمدة
    worksheet.columns = [
      { header: "postalAccount", key: "postalAccount", width: 20 },
      { header: "CLE CCP", key: "cleCcp", width: 10 },
      { header: "lastNameFr", key: "lastNameFr", width: 20 },
      { header: "firstNameFr", key: "firstNameFr", width: 20 },
      { header: "total", key: "total", width: 15 },
      { header: "compteB", key: "compteB", width: 15 },
      { header: "CLE BANK", key: "cle", width: 10 },
      { header: "startDate", key: "startDate", width: 20 },
      { header: "endDate", key: "endDate", width: 20 },
      { header: "Mois", key: "mois", width: 10 },
      { header: "Jour", key: "jour", width: 10 },
      { header: "Reference", key: "reference", width: 20 },
    ];

    worksheet.getColumn("total").numFmt = "0.00";

    // إعداد response
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=orders.xlsx"
    );

    // ✅ Streaming من MongoDB
    const stream = Order.find({ operation: operationId }).cursor();

    let index = 1;

    for (
      let order = await stream.next();
      order != null;
      order = await stream.next()
    ) {
      worksheet.addRow({
        postalAccount: order.postalAccount,
        cleCcp: order.cleCcp,
        lastNameFr: order.lastNameFr,
        firstNameFr: order.firstNameFr,
        total: order.total,
        compteB: "21002785",
        cle: "44",
        startDate: operation.startDate,
        endDate: operation.endDate,
        mois: operation.monthsCount,
        jour: 12,
        reference: index++,
      });
    }

    // كتابة الملف مباشرة
    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error(err);
    res.redirect("/?toast=error");
  }
});

module.exports = router;