import { useState } from "react";
import { Lock, User, Eye, EyeOff } from "lucide-react";
import logoImage from "@assets/لقطة_شاشة_2026-03-08_080127_1773036971718.png";

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    setTimeout(() => {
      if (username === "Ayoub" && password === "Ayoub123") {
        localStorage.setItem("aq_auth", "true");
        onLogin();
      } else {
        setError("اسم المستخدم أو كلمة المرور غير صحيحة");
      }
      setLoading(false);
    }, 600);
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

          <form onSubmit={handleSubmit} className="space-y-4">
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
          </form>
        </div>
      </div>
    </div>
  );
}
