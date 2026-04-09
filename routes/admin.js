const router = require("express").Router();
const bcrypt = require("bcrypt");
const User = require("../models/User");
const { isAuth, isAdmin } = require("../middlewares/auth");

// صفحة إدارة المستخدمين
router.get("/admin/users", isAuth, isAdmin, async (req, res) => {
    const users = await User.find();
    res.render("users", { users });
});

// إنشاء مستخدم
router.post("/admin/users/add", isAuth, isAdmin, async (req, res) => {
    const { email, password, role } = req.body;

    // التحقق من وجود المستخدم بالفعل
    const exists = await User.findOne({ email });
    if (exists) return res.redirect("/admin/users?toast=exists");

    // ✅ التحقق من كلمة المرور القوية
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,20}$/;
    if (!passwordRegex.test(password)) {
        return res.redirect("/admin/users?toast=weak_password");
    }

    // تشفير كلمة المرور
    const hash = await bcrypt.hash(password, 10);

    // إنشاء المستخدم
    await User.create({ email, password: hash, role });

    res.redirect("/admin/users?toast=created");
});

// ✏️ تعديل مستخدم
router.post("/admin/users/edit/:id", isAuth, isAdmin, async (req, res) => {
    const { email, password, role } = req.body;
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) return res.redirect("/admin/users?toast=not_found");

    // التحقق من كلمة المرور إذا تم تغييرها
    if (password) {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,20}$/;
        if (!passwordRegex.test(password)) {
            return res.redirect("/admin/users?toast=weak_password");
        }
        user.password = await bcrypt.hash(password, 10);
    }

    user.email = email || user.email;
    user.role = role || user.role;

    await user.save();

    res.redirect("/admin/users?toast=updated");
});

// 🗑️ حذف مستخدم
router.delete("/admin/users/delete/:id", isAuth, isAdmin, async (req, res) => {
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) return res.json({ success: false, message: "المستخدم غير موجود" });

    await User.findByIdAndDelete(userId);

    res.json({ success: true, message: "✅ تم حذف المستخدم بنجاح" });
});

module.exports = router;