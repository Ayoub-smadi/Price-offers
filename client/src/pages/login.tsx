import { useState } from "react";
import { Lock, User, Eye, EyeOff, KeyRound, ArrowRight } from "lucide-react";
import logoImage from "@assets/لقطة_شاشة_2026-03-08_080127_1773036971718.png";

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [mode, setMode] = useState<"login" | "change">("login");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changeError, setChangeError] = useState("");
  const [changeSuccess, setChangeSuccess] = useState(false);
  const [changeLoading, setChangeLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        localStorage.setItem("aq_auth", "true");
        localStorage.setItem("aq_username", username);
        onLogin();
      } else {
        const data = await res.json();
        setError(data.message || "اسم المستخدم أو كلمة المرور غير صحيحة");
      }
    } catch {
      setError("حدث خطأ في الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeError("");
    setChangeSuccess(false);

    if (newPass.length < 6) {
      setChangeError("كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (newPass !== confirmPass) {
      setChangeError("كلمة المرور الجديدة وتأكيدها غير متطابقتين");
      return;
    }

    setChangeLoading(true);
    try {
      const storedUsername = localStorage.getItem("aq_username") || "Ayoub";
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: storedUsername, oldPassword: oldPass, newPassword: newPass }),
      });
      const data = await res.json();
      if (res.ok) {
        setChangeSuccess(true);
        setOldPass("");
        setNewPass("");
        setConfirmPass("");
        setTimeout(() => {
          setMode("login");
          setChangeSuccess(false);
        }, 1800);
      } else {
        setChangeError(data.message || "حدث خطأ أثناء تغيير كلمة المرور");
      }
    } catch {
      setChangeError("حدث خطأ في الاتصال بالسيرفر");
    } finally {
      setChangeLoading(false);
    }
  };

  const switchMode = (next: "login" | "change") => {
    setMode(next);
    setError("");
    setChangeError("");
    setChangeSuccess(false);
    setOldPass("");
    setNewPass("");
    setConfirmPass("");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border/50 rounded-3xl shadow-2xl p-8 space-y-8">
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white border border-border/50 shadow-md flex items-center justify-center p-2">
              <img src={logoImage} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-black text-foreground">مؤسسة القادري الزراعية</h1>
              <p className="text-muted-foreground text-sm mt-1">نظام إدارة عروض الأسعار</p>
            </div>
          </div>

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground block">اسم المستخدم</label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-background border-2 border-border rounded-xl pr-10 pl-4 py-3 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-foreground"
                    placeholder="أدخل اسم المستخدم"
                    dir="ltr"
                    autoComplete="username"
                    data-testid="input-username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground block">كلمة المرور</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-background border-2 border-border rounded-xl pr-10 pl-10 py-3 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-foreground"
                    placeholder="أدخل كلمة المرور"
                    dir="ltr"
                    autoComplete="current-password"
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-xl px-4 py-3 text-center font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !username || !password}
                className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base"
                data-testid="button-login"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></span>
                    جاري تسجيل الدخول...
                  </span>
                ) : (
                  "تسجيل الدخول"
                )}
              </button>

              <button
                type="button"
                onClick={() => switchMode("change")}
                className="w-full text-sm text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1.5 py-1"
                data-testid="button-change-password-link"
              >
                <KeyRound className="w-3.5 h-3.5" />
                تغيير كلمة المرور
              </button>
            </form>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-back-login"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-black text-foreground">تغيير كلمة المرور</h2>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground block">كلمة المرور القديمة</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showOld ? "text" : "password"}
                    value={oldPass}
                    onChange={(e) => setOldPass(e.target.value)}
                    className="w-full bg-background border-2 border-border rounded-xl pr-10 pl-10 py-3 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-foreground"
                    placeholder="أدخل كلمة المرور الحالية"
                    dir="ltr"
                    autoComplete="current-password"
                    data-testid="input-old-password"
                  />
                  <button type="button" onClick={() => setShowOld(!showOld)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground block">كلمة المرور الجديدة</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    className="w-full bg-background border-2 border-border rounded-xl pr-10 pl-10 py-3 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-foreground"
                    placeholder="أدخل كلمة المرور الجديدة"
                    dir="ltr"
                    autoComplete="new-password"
                    data-testid="input-new-password"
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground block">تأكيد كلمة المرور الجديدة</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    className="w-full bg-background border-2 border-border rounded-xl pr-10 pl-10 py-3 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-foreground"
                    placeholder="أعد إدخال كلمة المرور الجديدة"
                    dir="ltr"
                    autoComplete="new-password"
                    data-testid="input-confirm-password"
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {changeError && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-xl px-4 py-3 text-center font-medium">
                  {changeError}
                </div>
              )}

              {changeSuccess && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 text-sm rounded-xl px-4 py-3 text-center font-bold">
                  تم تغيير كلمة المرور بنجاح ✓
                </div>
              )}

              <button
                type="submit"
                disabled={changeLoading || !oldPass || !newPass || !confirmPass}
                className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base"
                data-testid="button-submit-change"
              >
                {changeLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></span>
                    جاري الحفظ...
                  </span>
                ) : (
                  "تغيير كلمة المرور"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
