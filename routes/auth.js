const router = require("express").Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/User");

// صفحة login
router.get("/login", (req, res) => {
    res.render("login");
});

// تسجيل الدخول
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.redirect("/login?toast=invalid_login");

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.redirect("/login?toast=invalid_login");

    const token = jwt.sign(
        { id: user._id, role: user.role, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );

    res.cookie("token", token, {
        httpOnly: true,
        secure: true
    });

    // 🔑 إعادة التوجيه حسب الدور
    if (user.role === "admin") {
        return res.redirect("/admin/users"); // صفحة إدارة المستخدمين
    } else {
        return res.redirect("/"); // صفحة المستخدم العادي
    }
});

// تسجيل الخروج
router.get("/logout", (req, res) => {
    res.clearCookie("token");
    res.redirect("/login");
});

module.exports = router;