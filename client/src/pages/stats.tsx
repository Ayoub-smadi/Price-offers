import { useQuotations } from "@/hooks/use-quotations";
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval } from "date-fns";
import { ar } from "date-fns/locale";
import { TrendingUp, Users, FileText, DollarSign, Calendar, Award } from "lucide-react";

export default function Stats() {
  const { data: quotations, isLoading } = useQuotations();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {[1,2,3].map(i => <div key={i} className="h-32 bg-muted rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  const all = quotations || [];
  const now = new Date();
  const thisMonth = { start: startOfMonth(now), end: endOfMonth(now) };
  const lastMonth = { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };

  const thisMonthQuotes = all.filter(q => isWithinInterval(new Date(q.date), thisMonth));
  const lastMonthQuotes = all.filter(q => isWithinInterval(new Date(q.date), lastMonth));

  const totalRevenue = all.reduce((s, q) => s + Number(q.grandTotal), 0);
  const thisMonthRevenue = thisMonthQuotes.reduce((s, q) => s + Number(q.grandTotal), 0);
  const lastMonthRevenue = lastMonthQuotes.reduce((s, q) => s + Number(q.grandTotal), 0);
  const revenueChange = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

  // Top customers
  const customerMap = new Map<string, { count: number; total: number }>();
  all.forEach(q => {
    const existing = customerMap.get(q.customerName) || { count: 0, total: 0 };
    customerMap.set(q.customerName, { count: existing.count + 1, total: existing.total + Number(q.grandTotal) });
  });
  const topCustomers = Array.from(customerMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Monthly trend (last 6 months)
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(now, 5 - i);
    const interval = { start: startOfMonth(d), end: endOfMonth(d) };
    const monthQuotes = all.filter(q => isWithinInterval(new Date(q.date), interval));
    return {
      label: format(d, 'MMM', { locale: ar }),
      count: monthQuotes.length,
      revenue: monthQuotes.reduce((s, q) => s + Number(q.grandTotal), 0),
    };
  });

  const maxRevenue = Math.max(...months.map(m => m.revenue), 1);

  const StatCard = ({ icon: Icon, label, value, sub, color }: {
    icon: any; label: string; value: string; sub?: string; color: string;
  }) => (
    <div className="bg-card rounded-2xl border border-border/50 p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
        <p className="text-2xl font-black text-foreground mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-primary" />
          لوحة الإحصائيات
        </h1>
        <p className="text-muted-foreground mt-1">نظرة شاملة على أداء عروض الأسعار</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={FileText}
          label="إجمالي العروض"
          value={all.length.toString()}
          sub={`${thisMonthQuotes.length} هذا الشهر`}
          color="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
        />
        <StatCard
          icon={DollarSign}
          label="إجمالي الإيرادات"
          value={`${totalRevenue.toLocaleString()} د`}
          sub={`${thisMonthRevenue.toLocaleString()} هذا الشهر`}
          color="bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
        />
        <StatCard
          icon={TrendingUp}
          label="نمو هذا الشهر"
          value={`${revenueChange >= 0 ? '+' : ''}${revenueChange.toFixed(1)}%`}
          sub="مقارنةً بالشهر الماضي"
          color={revenueChange >= 0
            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
            : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"}
        />
        <StatCard
          icon={Users}
          label="عدد العملاء"
          value={customerMap.size.toString()}
          sub="عميل فريد"
          color="bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Monthly Bar Chart */}
        <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            الإيرادات الشهرية
          </h2>
          <p className="text-muted-foreground text-sm mb-6">آخر 6 أشهر</p>
          <div className="flex items-end gap-3 h-40">
            {months.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground font-medium">{m.revenue > 0 ? m.revenue.toLocaleString() : ''}</span>
                <div
                  className="w-full bg-primary/20 rounded-t-lg transition-all hover:bg-primary/40 relative group"
                  style={{ height: `${Math.max((m.revenue / maxRevenue) * 128, m.revenue > 0 ? 8 : 0)}px` }}
                >
                  <div
                    className="absolute inset-0 bg-primary rounded-t-lg opacity-80"
                    style={{ height: '100%' }}
                  />
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {m.count} عرض
                  </div>
                </div>
                <span className="text-xs font-semibold text-muted-foreground">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            أبرز العملاء
          </h2>
          <p className="text-muted-foreground text-sm mb-6">حسب إجمالي العروض</p>
          {topCustomers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لا توجد بيانات بعد</p>
          ) : (
            <div className="space-y-4">
              {topCustomers.map((c, i) => {
                const maxTotal = topCustomers[0].total;
                const pct = maxTotal > 0 ? (c.total / maxTotal) * 100 : 0;
                return (
                  <div key={c.name} className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`font-black w-5 text-center ${i === 0 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                          {i + 1}
                        </span>
                        <span className="font-semibold text-foreground">{c.name}</span>
                      </div>
                      <div className="text-left">
                        <span className="font-bold text-foreground">{c.total.toLocaleString()} د</span>
                        <span className="text-muted-foreground text-xs mr-2">({c.count} عرض)</span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Quotations */}
      <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          آخر العروض
        </h2>
        {all.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">لا توجد عروض بعد</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-3 text-muted-foreground font-semibold">رقم العرض</th>
                  <th className="pb-3 text-muted-foreground font-semibold">العميل</th>
                  <th className="pb-3 text-muted-foreground font-semibold">التاريخ</th>
                  <th className="pb-3 text-muted-foreground font-semibold text-left">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {all.slice(0, 8).map(q => (
                  <tr key={q.id} className="hover:bg-muted/50 transition-colors">
                    <td className="py-3 font-mono text-xs bg-primary/5 text-primary px-2 rounded">#{q.quotationNumber}</td>
                    <td className="py-3 font-semibold text-foreground pr-2">{q.customerName}</td>
                    <td className="py-3 text-muted-foreground">{format(new Date(q.date), 'dd MMM yyyy', { locale: ar })}</td>
                    <td className="py-3 font-black text-foreground text-left">{Number(q.grandTotal).toLocaleString()} د</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
