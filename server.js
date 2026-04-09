const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");
const app = express();
require('dotenv').config();
// الملفات الثابتة
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
const cookieParser = require("cookie-parser");
app.use(cookieParser());
// EJS
app.set("view engine", "ejs");
app.set('views', __dirname + '/views');
// اتصال بقاعدة البيانات
mongoose.connect(process.env.MONGO_URI).then(() => console.log("mongodb"))
  .catch(err => console.error("خطأ:", err));
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});
// الراوترات
const traderRoutes = require("./routes/traderRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const operationRoutes = require("./routes/operationRoutes");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");

app.use("/", traderRoutes);
app.use("/", productRoutes);
app.use("/", orderRoutes);
app.use("/", operationRoutes);
app.use("/", authRoutes);     // 🔐 تسجيل الدخول / logout
app.use("/", adminRoutes);    // 👤 إدارة المستخدمين
// تشغيل السيرفر
app.listen(process.env.PORT, () => console.log("server"));
