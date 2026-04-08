const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");
const app = express();
require('dotenv').config();
// الملفات الثابتة
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));

// EJS
app.set("view engine", "ejs");
app.set('views', __dirname + '/views');
// اتصال بقاعدة البيانات
mongoose.connect(process.env.MONGO_URI).then(() => console.log("mongodb"))
  .catch(err => console.error("خطأ:", err));

// الراوترات
const traderRoutes = require("./routes/traderRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const operationRoutes = require("./routes/operationRoutes");

app.use("/", traderRoutes);
app.use("/", productRoutes);
app.use("/", orderRoutes);
app.use("/", operationRoutes);

// تشغيل السيرفر
app.listen(process.env.PORT, () => console.log("server"));